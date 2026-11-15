import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authService from './authService.js';
import { requireAuth } from './middleware.js';
import {
  validateLogin,
  validatePasswordReset,
  validatePasswordResetRequest,
  validateRegistration,
} from './authRules.js';

const sessionCookieName = 'aero_session';
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

const setSessionCookie = (response, token, maxAge) => response.cookie(
  sessionCookieName,
  token,
  { ...cookieOptions, maxAge },
);

const clearSessionCookie = (response) => response.clearCookie(sessionCookieName, cookieOptions);

const check = (validator, requestProperty) => (request, response, next) => {
  const result = validator(request.body);
  if (result.error) {
    response.status(400).json({ message: result.error });
    return;
  }
  request[requestProperty] = result.value;
  next();
};

const checkRegistration = check(validateRegistration, 'validatedRegistration');
const checkLogin = check(validateLogin, 'validatedCredentials');
const checkPasswordResetRequest = check(validatePasswordResetRequest, 'validatedResetRequest');
const checkPasswordReset = check(validatePasswordReset, 'validatedPasswordReset');

async function register(request, response) {
  const session = await authService.registerCustomer(request.validatedRegistration);
  setSessionCookie(response, session.token, session.maxAge);
  response.status(201).json({ user: session.user });
}

async function login(request, response) {
  const session = await authService.login(request.validatedCredentials);
  setSessionCookie(response, session.token, session.maxAge);
  response.json({ user: session.user });
}

function currentUser(request, response) {
  response.json({ user: request.user });
}

async function logout(request, response) {
  await authService.logout(request.cookies?.[sessionCookieName]);
  clearSessionCookie(response);
  response.json({ message: 'ออกจากระบบแล้ว' });
}

async function requestPasswordReset(request, response) {
  await authService.requestPasswordReset(request.validatedResetRequest.email);
  response.status(202).json({
    message: 'หากอีเมลนี้มีบัญชีอยู่ ระบบจะส่งลิงก์รีเซ็ตรหัสผ่านให้ กรุณาตรวจสอบกล่องจดหมายและอีเมลขยะ',
  });
}

async function resetPassword(request, response) {
  await authService.resetPassword(request.validatedPasswordReset);
  response.json({ message: 'ตั้งรหัสผ่านใหม่แล้ว กรุณาเข้าสู่ระบบอีกครั้ง' });
}

const limit = (windowMs, requestLimit, message) => rateLimit({
  windowMs,
  limit: requestLimit,
  handler: (request, response) => response.status(429).json({ message }),
});

const router = Router();
const loginLimit = limit(15 * 60 * 1000, 10, 'พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่');
const registrationLimit = limit(60 * 60 * 1000, 5, 'สมัครสมาชิกหลายครั้งเกินไป กรุณารอสักครู่');
const passwordResetRequestLimit = limit(15 * 60 * 1000, 3, 'ขอรีเซ็ตรหัสผ่านหลายครั้งเกินไป กรุณารอสักครู่');
const passwordResetLimit = limit(15 * 60 * 1000, 10, 'ลองตั้งรหัสผ่านหลายครั้งเกินไป กรุณารอสักครู่');

router.post('/register', registrationLimit, checkRegistration, register);
router.post('/login', loginLimit, checkLogin, login);
router.post('/password/forgot', passwordResetRequestLimit, checkPasswordResetRequest, requestPasswordReset);
router.post('/password/reset', passwordResetLimit, checkPasswordReset, resetPassword);
router.post('/logout', logout);
router.get('/me', requireAuth, currentUser);

export default router;
