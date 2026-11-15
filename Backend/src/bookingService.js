import { sql } from './db/neon.js';

const toPublicId = (id) => `JOB-${String(id).padStart(4, '0')}`;

function toBooking(row) {
  return {
    id: toPublicId(row.id),
    serviceType: row.service_type,
    status: row.status,
    acType: row.ac_type,
    btu: Number(row.btu),
    issue: row.issue,
    installWork: row.install_work,
    date: String(row.appointment_date).slice(0, 10),
    timeSlot: row.time_slot,
    address: row.address,
    estimatedPrice: {
      min: Number(row.estimated_min),
      max: Number(row.estimated_max),
    },
    technician: row.technician,
    parts: row.parts || [],
    review: row.review_rating === null || row.review_rating === undefined
      ? null
      : { rating: Number(row.review_rating), comment: row.review_comment },
  };
}

export async function listBookings(customerId) {
  const rows = await sql`
    SELECT b.*, r.rating AS review_rating, r.comment AS review_comment
    FROM service_bookings b
    LEFT JOIN service_reviews r ON r.booking_id = b.id
    WHERE b.customer_id = ${customerId}
    ORDER BY b.created_at DESC
  `;
  return rows.map(toBooking);
}

export async function createBooking(booking) {
  const [row] = await sql`
    INSERT INTO service_bookings (
      customer_id, service_type, ac_type, btu, issue, install_work, appointment_date,
      time_slot, address, estimated_min, estimated_max
    )
    VALUES (
      ${booking.customerId}, ${booking.serviceType}, ${booking.acType}, ${booking.btu}, ${booking.issue},
      ${booking.installWork}, ${booking.date}, ${booking.timeSlot}, ${booking.address},
      ${booking.estimatedMin}, ${booking.estimatedMax}
    )
    RETURNING *
  `;
  return toBooking({ ...row, review_rating: null, review_comment: null });
}

export async function createReview(customerId, jobId, review) {
  const match = /^JOB-(\d{4,18})$/.exec(jobId);
  if (!match) {
    const error = new Error('หมายเลขงานไม่ถูกต้อง');
    error.status = 400;
    throw error;
  }

  const [booking] = await sql`
    SELECT id, status
    FROM service_bookings
    WHERE id = ${match[1]}
      AND customer_id = ${customerId}
  `;
  if (!booking) {
    const error = new Error('ไม่พบงานที่ต้องการรีวิว');
    error.status = 404;
    throw error;
  }
  if (booking.status !== 'completed') {
    const error = new Error('สามารถรีวิวได้หลังงานเสร็จสิ้นเท่านั้น');
    error.status = 409;
    throw error;
  }

  const [savedReview] = await sql`
    INSERT INTO service_reviews (booking_id, rating, comment)
    VALUES (${booking.id}, ${review.rating}, ${review.comment})
    ON CONFLICT (booking_id) DO UPDATE
      SET rating = EXCLUDED.rating,
          comment = EXCLUDED.comment,
          created_at = NOW()
    RETURNING rating, comment
  `;

  return { rating: Number(savedReview.rating), comment: savedReview.comment };
}
