const serviceTypes = new Set(['repair', 'install']);
const acTypes = new Set(['wall', 'ceiling']);
const issues = new Set(['clean', 'not_cold', 'leaking', 'not_working']);
const installWorks = new Set(['new', 'move']);
const timeSlots = new Set(['morning', 'afternoon']);
const btuSizes = new Set([9000, 18000, 30000]);

export function validateBooking(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'กรุณาส่งข้อมูลการจองให้ถูกต้อง' };
  }

  const {
    serviceType,
    acType,
    btu,
    issue,
    installWork,
    date,
    timeSlot,
    address,
  } = body;

  if (!serviceTypes.has(serviceType)) return { error: 'ประเภทบริการไม่ถูกต้อง' };
  if (!acTypes.has(acType)) return { error: 'ประเภทเครื่องปรับอากาศไม่ถูกต้อง' };
  if (!btuSizes.has(Number(btu))) return { error: 'ขนาด BTU ไม่ถูกต้อง' };
  if (serviceType === 'repair' && (!issues.has(issue) || installWork)) {
    return { error: 'กรุณาระบุอาการเสียให้ถูกต้อง' };
  }
  if (serviceType === 'install' && (!installWorks.has(installWork) || issue)) {
    return { error: 'กรุณาระบุลักษณะงานติดตั้งให้ถูกต้อง' };
  }
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date) {
    return { error: 'วันที่นัดหมายไม่ถูกต้อง' };
  }
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  if (date < today.toISOString().slice(0, 10)) {
    return { error: 'ไม่สามารถเลือกวันที่ผ่านมาแล้วได้' };
  }
  if (!timeSlots.has(timeSlot)) return { error: 'ช่วงเวลาไม่ถูกต้อง' };
  if (typeof address !== 'string' || address.trim().length < 8 || address.trim().length > 1000) {
    return { error: 'ที่อยู่ต้องมีความยาว 8 ถึง 1,000 ตัวอักษร' };
  }
  return {
    value: {
      serviceType,
      acType,
      btu: Number(btu),
      issue: serviceType === 'repair' ? issue : null,
      installWork: serviceType === 'install' ? installWork : null,
      date,
      timeSlot,
      address: address.trim(),
    },
  };
}

export function validateReview(body) {
  if (!body || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
    return { error: 'คะแนนรีวิวต้องอยู่ระหว่าง 1 ถึง 5 ดาว' };
  }
  if (body.comment !== undefined &&
      (typeof body.comment !== 'string' || body.comment.length > 500)) {
    return { error: 'รีวิวต้องมีความยาวไม่เกิน 500 ตัวอักษร' };
  }

  return { value: { rating: body.rating, comment: (body.comment || '').trim() } };
}

export function calculateEstimate(booking) {
  if (booking.serviceType === 'repair') {
    const basePrice = booking.btu <= 12000 ? 500 : 800;
    const serviceFee = booking.acType === 'ceiling' ? 300 : 0;
    const issueSurcharge = {
      clean: 0,
      not_cold: 800,
      leaking: 500,
      not_working: 1500,
    }[booking.issue];

    return {
      min: basePrice + serviceFee,
      max: basePrice + serviceFee + issueSurcharge,
    };
  }

  const basePrice = (booking.acType === 'wall' ? 2500 : 4500) +
    (booking.btu >= 18000 ? 1000 : 0);
  return booking.installWork === 'move'
    ? { min: basePrice + 1000, max: basePrice + 1500 }
    : { min: basePrice, max: basePrice };
}
