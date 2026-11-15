import { sessionCookieName, getUserForSession } from './authService.js';

export async function requireAuth(request, response, next) {
  const token = request.cookies?.[sessionCookieName];
  const user = await getUserForSession(token);
  if (!user) {
    response.status(401).json({ message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' });
    return;
  }

  request.user = user;
  next();
}

export function notFoundHandler(request, response) {
  response.status(404).json({ message: 'ไม่พบ API ที่ร้องขอ' });
}

export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    next(error);
    return;
  }

  console.error(error);
  const status = Number.isInteger(error.status) ? error.status : 500;
  const message = status < 500 || process.env.NODE_ENV !== 'production'
    ? error.message
    : 'เกิดข้อผิดพลาดในระบบ';

  response.status(status).json({ message });
}
