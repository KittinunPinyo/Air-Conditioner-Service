import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validateLogin,
  validatePasswordReset,
  validatePasswordResetRequest,
  validateRegistration,
} from '../src/authRules.js';

const validRegistration = {
  fullName: '  Kittinun Pinyo ',
  email: 'KITTINUN@example.com',
  phone: '081-234-5678',
  password: 'secure-password',
  confirmPassword: 'secure-password',
};

test('normalizes customer registration details', () => {
  const result = validateRegistration(validRegistration);

  assert.deepEqual(result.value, {
    fullName: 'Kittinun Pinyo',
    email: 'kittinun@example.com',
    phone: '0812345678',
    password: 'secure-password',
  });
});

test('rejects mismatched passwords and invalid phone numbers', () => {
  assert.match(validateRegistration({
    ...validRegistration,
    confirmPassword: 'different-password',
  }).error, /ไม่ตรงกัน/);
  assert.match(validateRegistration({ ...validRegistration, phone: 'abc' }).error, /เบอร์โทรศัพท์/);
});

test('accepts login credentials and only enables remembered sessions on true', () => {
  assert.deepEqual(validateLogin({
    email: 'USER@example.com',
    password: 'secret',
    rememberMe: true,
  }).value, {
    email: 'user@example.com',
    password: 'secret',
    rememberMe: true,
  });
  assert.equal(validateLogin({ email: 'user@example.com', password: 'secret' }).value.rememberMe, false);
});

test('normalizes password reset email and rejects malformed addresses', () => {
  assert.deepEqual(validatePasswordResetRequest({ email: ' USER@example.com ' }).value, {
    email: 'user@example.com',
  });
  assert.match(validatePasswordResetRequest({ email: 'not-an-email' }).error, /อีเมล/);
});

test('validates reset tokens and matching replacement passwords', () => {
  const token = 'A'.repeat(43);
  assert.deepEqual(validatePasswordReset({
    token,
    password: 'new-secure-password',
    confirmPassword: 'new-secure-password',
  }).value, { token, password: 'new-secure-password' });
  assert.match(validatePasswordReset({
    token,
    password: 'new-secure-password',
    confirmPassword: 'different-password',
  }).error, /ไม่ตรงกัน/);
  assert.match(validatePasswordReset({
    token: 'short',
    password: 'new-secure-password',
    confirmPassword: 'new-secure-password',
  }).error, /ลิงก์/);
});
