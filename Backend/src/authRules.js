const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?\d{9,15}$/;

export function validateRegistration(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' };
  }

  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const phone = typeof body.phone === 'string' ? body.phone.replace(/[\s()-]/g, '') : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (fullName.length < 2 || fullName.length > 120) {
    return { error: 'ชื่อต้องมีความยาว 2 ถึง 120 ตัวอักษร' };
  }
  if (email.length > 254 || !emailPattern.test(email)) {
    return { error: 'รูปแบบอีเมลไม่ถูกต้อง' };
  }
  if (!phonePattern.test(phone)) {
    return { error: 'กรุณากรอกเบอร์โทรศัพท์ 9 ถึง 15 หลัก' };
  }
  if (Buffer.byteLength(password, 'utf8') < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return { error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร และไม่เกิน 72 ไบต์' };
  }
  if (password !== body.confirmPassword) {
    return { error: 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน' };
  }

  return {
    value: { fullName, email, phone, password },
  };
}

export function validateLogin(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'กรุณากรอกอีเมลและรหัสผ่าน' };
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (email.length > 254 || !emailPattern.test(email) ||
      Buffer.byteLength(password, 'utf8') === 0 || Buffer.byteLength(password, 'utf8') > 72) {
    return { error: 'กรุณากรอกอีเมลและรหัสผ่านให้ถูกต้อง' };
  }

  return { value: { email, password, rememberMe: body.rememberMe === true } };
}

export function validatePasswordResetRequest(body) {
  const email = body && typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (email.length > 254 || !emailPattern.test(email)) {
    return { error: 'รูปแบบอีเมลไม่ถูกต้อง' };
  }
  return { value: { email } };
}

export function validatePasswordReset(body) {
  const token = body && typeof body.token === 'string' ? body.token : '';
  const password = body && typeof body.password === 'string' ? body.password : '';

  if (!/^[A-Za-z0-9_-]{20,128}$/.test(token)) {
    return { error: 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว' };
  }
  if (Buffer.byteLength(password, 'utf8') < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return { error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร และไม่เกิน 72 ไบต์' };
  }
  if (password !== body.confirmPassword) {
    return { error: 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน' };
  }
  return { value: { token, password } };
}
