import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { sql } from './db/neon.js';

export const sessionCookieName = 'aero_session';

const oneDay = 24 * 60 * 60 * 1000;
const resetTokenLifetime = 30 * 60 * 1000;
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

function toPublicUser(row) {
  return {
    id: String(row.id),
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
  };
}

async function findUserByEmail(email) {
  const [user] = await sql`
    SELECT id, full_name, email, phone, password_hash, role
    FROM users
    WHERE LOWER(email) = ${email}
  `;
  return user || null;
}

async function createUser({ fullName, email, phone, passwordHash }) {
  try {
    const [user] = await sql`
      INSERT INTO users (full_name, email, phone, password_hash)
      VALUES (${fullName}, ${email}, ${phone}, ${passwordHash})
      RETURNING id, full_name, email, phone, role
    `;
    return toPublicUser(user);
  } catch (error) {
    if (error.code === '23505') {
      const conflict = new Error('อีเมลนี้ถูกใช้ลงทะเบียนแล้ว');
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  }
}

async function createSession(userId, tokenHash, expiresAt) {
  await sql`
    INSERT INTO sessions (user_id, token_hash, expires_at)
    VALUES (${userId}, ${tokenHash}, ${expiresAt})
  `;
}

async function findUserBySession(tokenHash) {
  const [user] = await sql`
    SELECT u.id, u.full_name, u.email, u.phone, u.role
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash}
      AND s.expires_at > NOW()
  `;
  return user ? toPublicUser(user) : null;
}

async function deleteSession(tokenHash) {
  await sql`DELETE FROM sessions WHERE token_hash = ${tokenHash}`;
}

async function findUserIdByEmail(email) {
  const [user] = await sql`
    SELECT id
    FROM users
    WHERE LOWER(email) = ${email}
  `;
  return user ? String(user.id) : null;
}

async function createPasswordResetToken(userId, tokenHash, expiresAt) {
  await sql`
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES (${userId}, ${tokenHash}, ${expiresAt})
    ON CONFLICT (user_id) DO UPDATE
    SET token_hash = EXCLUDED.token_hash,
        expires_at = EXCLUDED.expires_at,
        used_at = NULL,
        created_at = NOW()
  `;
}

async function deletePasswordResetToken(tokenHash) {
  await sql`DELETE FROM password_reset_tokens WHERE token_hash = ${tokenHash}`;
}

async function updatePasswordWithResetToken(tokenHash, passwordHash) {
  const [result] = await sql`
    WITH consumed AS (
      UPDATE password_reset_tokens
      SET used_at = NOW()
      WHERE token_hash = ${tokenHash}
        AND used_at IS NULL
        AND expires_at > NOW()
      RETURNING user_id
    ),
    updated_user AS (
      UPDATE users
      SET password_hash = ${passwordHash}
      WHERE id IN (SELECT user_id FROM consumed)
      RETURNING id
    ),
    revoked_sessions AS (
      DELETE FROM sessions
      WHERE user_id IN (SELECT id FROM updated_user)
      RETURNING id
    )
    SELECT id FROM updated_user
  `;
  return Boolean(result);
}

function getSmtpSettings() {
  const {
    SMTP_HOST: host,
    SMTP_PORT: portValue,
    SMTP_SECURE: secureValue,
    SMTP_USER: user,
    SMTP_PASSWORD: password,
    SMTP_FROM: from,
    APP_ORIGIN: appOrigin,
  } = process.env;
  const port = Number(portValue);
  let resetUrl;

  try {
    const origin = new URL(appOrigin);
    if (!['http:', 'https:'].includes(origin.protocol)) throw new Error();
    resetUrl = new URL('/reset-password', origin).toString();
  } catch {
    const error = new Error('ยังไม่ได้ตั้งค่าระบบส่งอีเมลใน Backend/.env');
    error.status = 503;
    throw error;
  }

  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 ||
      !['true', 'false'].includes((secureValue || '').toLowerCase()) ||
      !user || !password || !from) {
    const error = new Error('ยังไม่ได้ตั้งค่าระบบส่งอีเมลใน Backend/.env');
    error.status = 503;
    throw error;
  }

  return { host, port, secure: secureValue.toLowerCase() === 'true', user, password, from, resetUrl };
}

function assertSmtpConfigured() {
  getSmtpSettings();
}

async function sendPasswordResetEmail(email, token) {
  const settings = getSmtpSettings();
  const resetUrl = new URL(settings.resetUrl);
  resetUrl.searchParams.set('token', token);
  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: { user: settings.user, pass: settings.password },
  });

  await transporter.sendMail({
    from: settings.from,
    to: email,
    subject: 'รีเซ็ตรหัสผ่าน AeroService',
    text: `ใช้ลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ (ลิงก์ใช้ได้ 30 นาที): ${resetUrl}`,
    html: `<p>มีคำขอตั้งรหัสผ่านใหม่สำหรับบัญชี AeroService</p><p><a href="${resetUrl}">ตั้งรหัสผ่านใหม่</a></p><p>ลิงก์นี้ใช้ได้ 30 นาที หากคุณไม่ได้ร้องขอ สามารถละเว้นอีเมลนี้ได้</p>`,
  });
}

async function createSessionForUser(user, duration, persistent = false) {
  const token = randomBytes(32).toString('base64url');
  await createSession(user.id, hashToken(token), new Date(Date.now() + duration));
  return { user, token, maxAge: persistent ? duration : undefined };
}

function invalidCredentials() {
  const error = new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  error.status = 401;
  return error;
}

export async function registerCustomer(registration) {
  const existingUser = await findUserByEmail(registration.email);
  if (existingUser) {
    const error = new Error('อีเมลนี้ถูกใช้ลงทะเบียนแล้ว');
    error.status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(registration.password, 12);
  const user = await createUser({ ...registration, passwordHash });
  return createSessionForUser(user, 30 * oneDay, true);
}

export async function login(credentials) {
  const user = await findUserByEmail(credentials.email);
  if (!user || !(await bcrypt.compare(credentials.password, user.password_hash))) {
    throw invalidCredentials();
  }

  const persistent = credentials.rememberMe;
  return createSessionForUser(
    toPublicUser(user),
    persistent ? 30 * oneDay : oneDay,
    persistent,
  );
}

export async function getUserForSession(token) {
  if (!token) return null;
  return findUserBySession(hashToken(token));
}

export async function logout(token) {
  if (token) await deleteSession(hashToken(token));
}

export async function requestPasswordReset(email) {
  assertSmtpConfigured();
  const userId = await findUserIdByEmail(email);
  if (!userId) return;

  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  await createPasswordResetToken(userId, tokenHash, new Date(Date.now() + resetTokenLifetime));

  try {
    await sendPasswordResetEmail(email, token);
  } catch (error) {
    console.error('Password reset email delivery failed', {
      code: error.code || error.name || 'unknown',
    });
    try {
      await deletePasswordResetToken(tokenHash);
    } catch (cleanupError) {
      console.error('Password reset token cleanup failed', {
        code: cleanupError.code || cleanupError.name || 'unknown',
      });
    }
  }
}

export async function resetPassword({ token, password }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const updated = await updatePasswordWithResetToken(hashToken(token), passwordHash);
  if (!updated) {
    const error = new Error('ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว');
    error.status = 400;
    throw error;
  }
}
