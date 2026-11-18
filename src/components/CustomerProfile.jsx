import { useState } from 'react';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { formatDate, jobStages, useCustomerData } from './customerContext';
import { LogoutButton } from './AuthPages';

function PaymentProof({ job, refreshBookings }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [submittedPayment, setSubmittedPayment] = useState(null);
  const status = submittedPayment?.status || job.paymentStatus;
  const amount = submittedPayment?.amount ?? job.finalPrice;
  const statusLabels = {
    pending: ['รอตรวจสอบหลักฐาน', 'warning'],
    approved: ['ชำระเงินแล้ว', 'success'],
    rejected: ['หลักฐานถูกปฏิเสธ', 'danger'],
  };
  const [label, tone] = statusLabels[status] || ['ยังไม่ได้ส่งหลักฐาน', 'secondary'];

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    setError('');
    setUploading(true);

    try {
      const response = await fetch(`/api/bookings/${encodeURIComponent(job.id)}/payment-proof`, {
        method: 'POST',
        credentials: 'same-origin',
        body: formData,
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Backend ส่งข้อมูลกลับมาไม่ถูกต้อง (HTTP ${response.status})`);
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || `ส่งหลักฐานไม่สำเร็จ (${response.status})`);
      if (payload.payment?.status !== 'pending' || !Number.isFinite(Number(payload.payment.amount))) {
        throw new Error('Backend ส่งสถานะการชำระเงินกลับมาไม่ถูกต้อง');
      }
      setSubmittedPayment(payload.payment);
      formElement.reset();
      const bookings = await refreshBookings();
      if (bookings) setSubmittedPayment(null);
    } catch (requestError) {
      setError(requestError.message || 'ส่งหลักฐานการชำระเงินไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-3 p-3 mb-3 bg-light border">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <strong className="small">หลักฐานการชำระเงิน</strong>
        <span className={`badge text-bg-${tone}`} role="status">{label}</span>
      </div>
      {amount != null && <p className="small mb-2">ยอดชำระ <strong>{Number(amount).toLocaleString('th-TH')} ฿</strong></p>}
      {status !== 'approved' && (
        job.finalPrice == null
          ? <p className="small text-muted mb-0">รอสรุปราคาสุดท้ายจากทีมช่างก่อนส่งหลักฐาน</p>
          : <form onSubmit={handleSubmit}>
            <label className="form-label small mb-1" htmlFor={`payment-proof-${job.id}`}>แนบสลิปหรือหลักฐานการชำระเงิน</label>
            <div className="d-flex flex-wrap gap-2">
              <input id={`payment-proof-${job.id}`} className="form-control form-control-sm flex-grow-1" type="file" name="file" accept="image/*" required />
              <button className="btn btn-primary btn-sm text-nowrap" type="submit" disabled={uploading}>
                {uploading ? 'กำลังส่ง…' : status === 'rejected' ? 'ส่งหลักฐานใหม่' : status === 'pending' ? 'ส่งหลักฐานใหม่' : 'ส่งหลักฐาน'}
              </button>
            </div>
            {error && <p className="text-danger small mt-2 mb-0" role="alert">{error}</p>}
          </form>
      )}
    </div>
  );
}

export default function CustomerProfile() {
  const { user, jobs, reviews, saveReview, refreshBookings, loading, error: dataError } = useCustomerData();
  const [ratings, setRatings] = useState({});
  const [reviewComments, setReviewComments] = useState({});
  const [reviewErrors, setReviewErrors] = useState({});
  const completedJobs = jobs.filter((job) => job.status === 'completed');

  const handleReviewSubmit = async (event, jobId) => {
    event.preventDefault();
    const rating = ratings[jobId] || 0;
    if (!rating) {
      setReviewErrors((currentErrors) => ({ ...currentErrors, [jobId]: 'กรุณาเลือกคะแนนก่อนส่งรีวิว' }));
      return;
    }

    try {
      await saveReview(jobId, { rating, comment: (reviewComments[jobId] || '').trim() });
      setReviewErrors((currentErrors) => ({ ...currentErrors, [jobId]: '' }));
    } catch (requestError) {
      setReviewErrors((currentErrors) => ({ ...currentErrors, [jobId]: requestError.message }));
    }
  };

  return (
    <div className="min-vh-100 pb-5" style={{ backgroundColor: '#f4f9ff' }}>
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm py-3 px-4 mb-4 sticky-top">
        <div className="container-fluid">
          <Link className="navbar-brand fw-bolder fs-4" to="/home" style={{ color: '#0056b3' }}>
            AeroService
          </Link>
          <div className="d-flex align-items-center gap-3">
            <span className="text-secondary fw-semibold d-none d-sm-block small">{user.fullName}</span>
            <div className="text-white rounded-circle d-flex justify-content-center align-items-center fw-bold shadow-sm"
                 style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg, #0d6efd, #00b4d8)' }}>
              {user.fullName.charAt(0)}
            </div>
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="container">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <h1 className="h3 fw-bolder mb-1" style={{ color: '#003a7a' }}>โปรไฟล์ของฉัน</h1>
            <p className="text-muted small mb-0">ข้อมูลบัญชีและประวัติการใช้บริการ</p>
          </div>
          <Link to="/home" className="btn btn-primary rounded-pill px-4">กลับหน้าหลัก</Link>
        </div>

        <div className="row g-4 align-items-start">
          <div className="col-12 col-lg-4">
            <section className="card border-0 p-4 text-center"
                     style={{ borderRadius: '1.5rem', boxShadow: '0 10px 40px rgba(13, 110, 253, 0.05)' }}>
              <div className="text-white rounded-circle d-flex justify-content-center align-items-center fw-bold mx-auto mb-3"
                   style={{ width: '76px', height: '76px', fontSize: '1.7rem', background: 'linear-gradient(135deg, #0d6efd, #00b4d8)' }}>
                {user.fullName.charAt(0)}
              </div>
              <h2 className="h5 fw-bold mb-1">{user.fullName}</h2>
              <span className="badge bg-primary-subtle text-primary align-self-center mb-4">ลูกค้า</span>

              <div className="text-start border-top pt-3">
                <p className="small text-muted mb-1">อีเมล</p>
                <p className="fw-semibold mb-3">{user.email}</p>
                <p className="small text-muted mb-1">เบอร์โทรศัพท์</p>
                <p className="fw-semibold mb-3">{user.phone}</p>
                <p className="small text-muted mb-1">งานที่เสร็จสิ้น</p>
                <p className="fw-semibold mb-0">{completedJobs.length} งาน</p>
              </div>
              <p className="text-muted small mt-4 mb-0">บัญชีลูกค้า</p>
            </section>
          </div>

          <div className="col-12 col-lg-8">
            <section className="card border-0 p-4 p-md-5"
                     style={{ borderRadius: '1.5rem', boxShadow: '0 10px 40px rgba(13, 110, 253, 0.05)' }}>
              <div className="mb-4">
                <h2 className="h4 fw-bolder mb-1" style={{ color: '#003a7a' }}>ประวัติการใช้บริการ</h2>
                <p className="text-muted small mb-0">รายการงานที่เสร็จสิ้น อะไหล่ที่เปลี่ยน และรีวิวทีมช่าง</p>
              </div>

              {dataError && <div className="alert alert-danger small" role="alert">{dataError}</div>}
              {loading ? (
                <p className="text-muted small">กำลังโหลดประวัติการใช้บริการ...</p>
              ) : completedJobs.length === 0 ? (
                <div className="text-center rounded-4 p-4" style={{ backgroundColor: '#f4f9ff' }}>
                  <p className="fw-semibold mb-1">ยังไม่มีประวัติการใช้บริการ</p>
                  <p className="text-muted small mb-3">เมื่อมีงานที่เสร็จสิ้น ประวัติจะแสดงที่นี่</p>
                  <Link to="/home" className="btn btn-outline-primary btn-sm">จองบริการ</Link>
                </div>
              ) : completedJobs.map((job) => (
                <article key={job.id} className="border rounded-4 p-3 p-md-4 mb-3">
                  <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
                    <div>
                      <span className="badge bg-success-subtle text-success mb-2">เสร็จสิ้น</span>
                      <h3 className="h6 fw-bold mb-1">
                        {job.id} · {job.serviceType === 'install' ? 'ติดตั้ง / ย้ายแอร์' : job.issue === 'clean' ? 'ล้างแอร์' : 'ซ่อมแอร์'}
                      </h3>
                      <p className="text-muted small mb-0">{formatDate(job.date)} · {job.technician || 'ทีมช่าง'}</p>
                    </div>
                    <strong className="text-primary">
                      ประเมิน {job.estimatedPrice.min.toLocaleString()}
                      {job.estimatedPrice.min !== job.estimatedPrice.max && ` - ${job.estimatedPrice.max.toLocaleString()}`} ฿
                    </strong>
                  </div>

                  <div className="d-flex flex-wrap gap-2 mb-3" aria-label={`ไทม์ไลน์งาน ${job.id}`}>
                    {jobStages.map((stage) => (
                      <span key={stage.key} className="small text-success fw-semibold">✓ {stage.label}</span>
                    ))}
                  </div>

                  <div className="small mb-3">
                    <strong>อะไหล่ / วัสดุที่บันทึก:</strong>
                    {job.parts?.length ? (
                      <ul className="mb-0 mt-1">
                        {job.parts.map((part) => <li key={part}>{part}</li>)}
                      </ul>
                    ) : <p className="text-muted mb-0 mt-1">ไม่มีรายการอะไหล่</p>}
                  </div>

                  <PaymentProof job={job} refreshBookings={refreshBookings} />

                  {reviews[job.id] ? (
                    <div className="alert alert-success mb-0">
                      <strong>ขอบคุณสำหรับรีวิว</strong>
                      <div className="text-warning" aria-label={`คะแนน ${reviews[job.id].rating} จาก 5`}>
                        {'★'.repeat(reviews[job.id].rating)}{'☆'.repeat(5 - reviews[job.id].rating)}
                      </div>
                      {reviews[job.id].comment && <p className="small mb-0 mt-1">{reviews[job.id].comment}</p>}
                    </div>
                  ) : (
                    <form onSubmit={(event) => handleReviewSubmit(event, job.id)}>
                      <label className="form-label fw-bold small">ให้คะแนนทีมช่าง</label>
                      <div className="d-flex gap-1 mb-2" role="group" aria-label={`ให้คะแนนงาน ${job.id}`}>
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button key={rating} type="button" className="btn btn-link p-0 text-decoration-none"
                                  aria-label={`${rating} ดาว`} aria-pressed={ratings[job.id] === rating}
                                  onClick={() => {
                                    setRatings((currentRatings) => ({ ...currentRatings, [job.id]: rating }));
                                    setReviewErrors((currentErrors) => ({ ...currentErrors, [job.id]: '' }));
                                  }}
                                  style={{ color: rating <= (ratings[job.id] || 0) ? '#f0ad00' : '#adb5bd', fontSize: '1.8rem', lineHeight: 1 }}>
                            ★
                          </button>
                        ))}
                      </div>
                      <textarea className="form-control mb-2" rows="2" maxLength={500}
                                placeholder="เขียนรีวิวเพิ่มเติม (ไม่บังคับ)"
                                value={reviewComments[job.id] || ''}
                                onChange={(event) => setReviewComments((currentComments) => ({
                                  ...currentComments,
                                  [job.id]: event.target.value,
                                }))} />
                      {reviewErrors[job.id] && <p className="text-danger small mb-2" role="alert">{reviewErrors[job.id]}</p>}
                      <button type="submit" className="btn btn-primary btn-sm">ส่งรีวิว</button>
                    </form>
                  )}
                </article>
              ))}
              {!dataError && !loading && <p className="text-muted small mb-0">รายการและรีวิวนี้อ่าน/บันทึกผ่าน Backend</p>}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
