import { useState } from 'react';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './CustomerTheme.css';
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
    <div className="customer-theme min-vh-100 pb-5">
      {/* Navbar สไตล์กระจกใส */}
      <nav className="navbar navbar-expand-lg customer-navbar py-3 px-3 px-md-4 mb-4 sticky-top">
        <div className="container-fluid max-w-7xl mx-auto">
          <Link className="customer-brand-logo" to="/home">
            <div className="customer-brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/>
                <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.25"/>
              </svg>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="customer-brand-text">AeroService</span>
              <span className="customer-brand-tag d-none d-sm-inline-block">Air Care</span>
            </div>
          </Link>
          <div className="d-flex align-items-center gap-2 gap-sm-3">
            <div className="customer-user-chip">
              <span className="customer-avatar">
                {user.fullName.charAt(0)}
              </span>
              <span className="customer-user-name d-none d-md-block">{user.fullName}</span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="container">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <h1 className="h3 fw-bolder mb-1" style={{ color: '#0c2b5e' }}>โปรไฟล์ของฉัน</h1>
            <p className="text-muted small mb-0">ข้อมูลบัญชีและประวัติการใช้บริการ</p>
          </div>
          <Link to="/home" className="btn customer-back-btn text-decoration-none d-inline-flex align-items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            <span>กลับหน้าหลัก</span>
          </Link>
        </div>

        <div className="row g-4 align-items-start">
          <div className="col-12 col-lg-4">
            <section className="card customer-card border-0 p-4 text-center">
              <div className="customer-profile-avatar-box">
                <div className="customer-profile-avatar">
                  {user.fullName.charAt(0)}
                </div>
              </div>
              <h2 className="h5 fw-bolder mb-1" style={{ color: '#0c2b5e' }}>{user.fullName}</h2>
              <div className="d-inline-flex justify-content-center mb-3">
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1 fw-semibold">
                  ✓ ลูกค้าทั่วไป
                </span>
              </div>

              {/* สรุปสถิติผู้ใช้งาน */}
              <div className="customer-stat-grid">
                <div className="customer-stat-card">
                  <div className="val">{completedJobs.length}</div>
                  <div className="lbl">งานที่เสร็จสิ้น</div>
                </div>
                <div className="customer-stat-card">
                  <div className="val text-success">100%</div>
                  <div className="lbl">ความพึงพอใจ</div>
                </div>
              </div>

              <div className="text-start border-top pt-3" style={{ borderColor: '#e2edf9' }}>
                <div className="customer-info-item">
                  <div className="customer-info-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-muted small mb-0" style={{ fontSize: '0.75rem' }}>อีเมล</p>
                    <p className="fw-semibold mb-0 text-dark text-truncate small">{user.email}</p>
                  </div>
                </div>

                <div className="customer-info-item">
                  <div className="customer-info-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-muted small mb-0" style={{ fontSize: '0.75rem' }}>เบอร์โทรศัพท์</p>
                    <p className="fw-semibold mb-0 text-dark small">{user.phone}</p>
                  </div>
                </div>
              </div>
              <p className="text-muted small mt-3 mb-0" style={{ fontSize: '0.78rem' }}>สถานะบัญชี: ปกติ</p>
            </section>
          </div>

          <div className="col-12 col-lg-8">
            <section className="card customer-card border-0 p-4 p-md-5">
              <div className="mb-4">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <div className="customer-card-badge">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 14 14"/>
                    </svg>
                  </div>
                  <h2 className="h4 fw-bolder mb-0 customer-card-title">ประวัติการใช้บริการ</h2>
                </div>
                <p className="text-muted small mb-0 ms-1">รายการงานที่เสร็จสิ้น อะไหล่ที่เปลี่ยน และรีวิวทีมช่าง</p>
              </div>

              {dataError && <div className="alert alert-danger small rounded-3" role="alert">{dataError}</div>}
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary spinner-border-sm mb-2" role="status"></div>
                  <p className="text-muted small mb-0">กำลังโหลดประวัติการใช้บริการ...</p>
                </div>
              ) : completedJobs.length === 0 ? (
                <div className="customer-empty-state my-3">
                  <div className="customer-empty-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10 9 9 9 8 9"/>
                    </svg>
                  </div>
                  <h6 className="fw-bold mb-1" style={{ color: '#1e3a5f' }}>ยังไม่มีประวัติการใช้บริการ</h6>
                  <p className="text-muted small mb-3" style={{ maxWidth: '300px', margin: '0 auto', lineHeight: 1.5 }}>
                    เมื่อมีงานซ่อมหรือติดตั้งที่เสร็จสิ้น ประวัติการทำงานและใบเสร็จจะแสดงที่นี่
                  </p>
                  <Link to="/home" className="btn customer-submit-btn py-2 px-4 d-inline-flex" style={{ width: 'auto' }}>
                    จองบริการตอนนี้
                  </Link>
                </div>
              ) : completedJobs.map((job) => (
                <article key={job.id} className="border rounded-4 p-3 p-md-4 mb-3" style={{ backgroundColor: '#f8fbff', borderColor: '#e2edf9' }}>
                  <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
                    <div>
                      <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill mb-2 px-2 py-1">
                        ✓ เสร็จสิ้นแล้ว
                      </span>
                      <h3 className="h6 fw-bold mb-1 text-dark">
                        {job.id} · {job.serviceType === 'install' ? 'ติดตั้ง / ย้ายแอร์' : job.issue === 'clean' ? 'ล้างแอร์' : 'ซ่อมแอร์'}
                      </h3>
                      <p className="text-muted small mb-0">{formatDate(job.date)} · {job.technician || 'ทีมช่าง AeroService'}</p>
                    </div>
                    <strong className="text-primary fs-5">
                      {job.estimatedPrice.min.toLocaleString()}
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
                    <div className="alert alert-success mb-0 rounded-3 border-0">
                      <strong>ขอบคุณสำหรับรีวิว</strong>
                      <div className="text-warning fs-5" aria-label={`คะแนน ${reviews[job.id].rating} จาก 5`}>
                        {'★'.repeat(reviews[job.id].rating)}{'☆'.repeat(5 - reviews[job.id].rating)}
                      </div>
                      {reviews[job.id].comment && <p className="small mb-0 mt-1">{reviews[job.id].comment}</p>}
                    </div>
                  ) : (
                    <form onSubmit={(event) => handleReviewSubmit(event, job.id)}>
                      <label className="form-label fw-bold small text-dark">ให้คะแนนทีมช่าง</label>
                      <div className="d-flex gap-1 mb-2" role="group" aria-label={`ให้คะแนนงาน ${job.id}`}>
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button key={rating} type="button" className="btn btn-link p-0 text-decoration-none"
                                  aria-label={`${rating} ดาว`} aria-pressed={ratings[job.id] === rating}
                                  onClick={() => {
                                    setRatings((currentRatings) => ({ ...currentRatings, [job.id]: rating }));
                                    setReviewErrors((currentErrors) => ({ ...currentErrors, [job.id]: '' }));
                                  }}
                                  style={{ color: rating <= (ratings[job.id] || 0) ? '#f59e0b' : '#cbd5e1', fontSize: '1.8rem', lineHeight: 1 }}>
                            ★
                          </button>
                        ))}
                      </div>
                      <textarea className="form-control customer-input mb-2" rows="2" maxLength={500}
                                placeholder="เขียนรีวิวเพิ่มเติมเพื่อเป็นกำลังใจให้ทีมช่าง (ไม่บังคับ)"
                                value={reviewComments[job.id] || ''}
                                onChange={(event) => setReviewComments((currentComments) => ({
                                  ...currentComments,
                                  [job.id]: event.target.value,
                                }))} />
                      {reviewErrors[job.id] && <p className="text-danger small mb-2" role="alert">{reviewErrors[job.id]}</p>}
                      <button type="submit" className="btn btn-primary btn-sm rounded-pill px-3 fw-bold">ส่งรีวิว</button>
                    </form>
                  )}
                </article>
              ))}
              {!dataError && !loading && <p className="text-muted small mb-0 mt-3">ระบบบันทึกและประมวลผลข้อมูลผ่านคลาวด์มาตรฐานความปลอดภัย</p>}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
