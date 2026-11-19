import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useCustomerData } from './customerContext';

function PasswordCard({ title, description, children }) {
  return (
    <main className="min-vh-100 d-flex align-items-center justify-content-center px-3 py-5" style={{ backgroundColor: '#f4f9ff' }}>
      <section className="card border-0 p-4 p-sm-5 w-100" style={{ maxWidth: '480px', borderRadius: '1.5rem', boxShadow: '0 10px 40px rgba(13, 110, 253, 0.08)' }}>
        <header className="text-center mb-4">
          <h1 className="h3 fw-bolder mb-2" style={{ color: '#003a7a' }}>{title}</h1>
          <p className="text-muted small mb-0">{description}</p>
        </header>
        {children}
      </section>
    </main>
  );
}

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useCustomerData();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await requestPasswordReset(email);
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PasswordCard title="ลืมรหัสผ่าน?" description="กรอกอีเมลที่ใช้สมัคร แล้วเราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่">
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="resetEmail" className="form-label fw-semibold">อีเมล</label>
          <input
            id="resetEmail"
            name="email"
            type="email"
            className="form-control"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <button type="submit" className="btn text-white w-100 fw-bold" disabled={busy} style={{ padding: '0.85rem', borderRadius: '1rem', background: 'linear-gradient(135deg, #003a7a 0%, #0d6efd 100%)', border: 'none' }}>
          {busy ? 'กำลังส่งคำขอ...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
        </button>
        {error && <div className="alert alert-danger py-2 small mt-3 mb-0" role="alert">{error}</div>}
        {message && <div className="alert alert-info py-2 small mt-3 mb-0" role="status">{message}</div>}
      </form>
      <p className="text-center text-muted small mt-4 mb-0">
        จำรหัสผ่านได้แล้ว? <Link to="/login" className="fw-bold text-decoration-none" style={{ color: '#0056b3' }}>เข้าสู่ระบบ</Link>
      </p>
    </PasswordCard>
  );
}

export function ResetPasswordPage() {
  const { resetPassword } = useCustomerData();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token] = useState(() => searchParams.get('token') || '');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (token) navigate('/reset-password', { replace: true });
  }, [navigate, token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    if (password !== confirmPassword) {
      setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await resetPassword({ token, password, confirmPassword });
      setMessage(result.message);
      setComplete(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PasswordCard title="ตั้งรหัสผ่านใหม่" description="ลิงก์รีเซ็ตใช้ได้ 30 นาทีและใช้ได้ครั้งเดียว">
      {!token && (
        <div className="alert alert-warning small mb-0" role="alert">
          ไม่พบลิงก์รีเซ็ตที่ถูกต้อง <Link to="/forgot-password">ขอลิงก์ใหม่</Link>
        </div>
      )}
      {token && !complete && (
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="newPassword" className="form-label fw-semibold">รหัสผ่านใหม่</label>
            <input id="newPassword" name="password" type="password" className="form-control" autoComplete="new-password" minLength={6} maxLength={72} required />
          </div>
          <div className="mb-3">
            <label htmlFor="confirmPassword" className="form-label fw-semibold">ยืนยันรหัสผ่านใหม่</label>
            <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={6} maxLength={72} required />
          </div>
          <button type="submit" className="btn text-white w-100 fw-bold" disabled={busy} style={{ padding: '0.85rem', borderRadius: '1rem', background: 'linear-gradient(135deg, #003a7a 0%, #0d6efd 100%)', border: 'none' }}>
            {busy ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
          </button>
        </form>
      )}
      {error && <div className="alert alert-danger py-2 small mt-3 mb-0" role="alert">{error}</div>}
      {message && <div className="alert alert-success py-2 small mt-3 mb-0" role="status">{message}</div>}
      {complete && <p className="text-center mt-4 mb-0"><Link to="/login" className="fw-bold text-decoration-none" style={{ color: '#0056b3' }}>ไปหน้าเข้าสู่ระบบ</Link></p>}
    </PasswordCard>
  );
}
