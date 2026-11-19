import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useCustomerData } from './customerContext';
import { roleHome } from './roles';

function AuthLayout({ children, image, heading, description }) {
  return (
    <div className="container-fluid min-vh-100 p-0">
      <div className="row g-0 min-vh-100">
        <div
          className="col-md-6 d-none d-md-flex flex-column justify-content-between p-5"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 58, 122, 0.85), rgba(13, 110, 253, 0.75)), url('${image}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <h2 className="text-white fw-bold">AeroService</h2>
          <div className="text-white mb-5 pb-5">
            <h1 className="fw-bolder display-5 mb-3">{heading}</h1>
            <p className="lead opacity-75">{description}</p>
          </div>
        </div>
        <div className="col-12 col-md-6 d-flex align-items-center justify-content-center py-4" style={{ backgroundColor: '#f4f9ff' }}>
          <div className="w-100" style={{ maxWidth: '480px', padding: '2rem' }}>
            <section className="card border-0 p-4 p-sm-5 bg-white" style={{ borderRadius: '1.5rem', boxShadow: '0 10px 40px rgba(13, 110, 253, 0.05)' }}>
              {children}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthField({ id, label, type, name, autoComplete, ...inputProps }) {
  return (
    <div className="form-floating mb-3">
      <input
        id={id}
        name={name}
        type={type}
        className="form-control border-0 shadow-none fw-semibold"
        placeholder={label}
        autoComplete={autoComplete}
        required
        style={{ borderRadius: '1rem', backgroundColor: '#f0f5fc', color: '#333' }}
        {...inputProps}
      />
      <label htmlFor={id} style={{ color: '#0056b3' }}>{label}</label>
    </div>
  );
}

function AuthSubmitButton({ busy, children }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="btn text-white w-100 fw-bold mb-4"
      style={{
        padding: '0.85rem',
        borderRadius: '1rem',
        fontSize: '1.1rem',
        background: 'linear-gradient(135deg, #003a7a 0%, #0d6efd 100%)',
        border: 'none',
        boxShadow: '0 8px 20px rgba(13, 110, 253, 0.2)',
      }}
    >
      {busy ? 'กำลังดำเนินการ...' : children}
    </button>
  );
}

export function LogoutButton() {
  const { logout } = useCustomerData();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleLogout = async () => {
    setBusy(true);
    setError('');
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="d-flex align-items-center gap-2">
      {error && <span className="text-danger small" role="alert">{error}</span>}
      <button
        type="button"
        className="btn btn-light text-danger btn-sm rounded-pill fw-bold px-3 shadow-sm border-0"
        onClick={handleLogout}
        disabled={busy}
      >
        {busy ? 'กำลังออก...' : 'ออก'}
      </button>
    </div>
  );
}

export function LoginPage() {
  const { login, authError } = useCustomerData();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const signedInUser = await login({
        email: formData.get('email'),
        password: formData.get('password'),
        rememberMe: formData.get('rememberMe') === 'on',
      });
      navigate(roleHome(signedInUser.role), { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      image="https://images.unsplash.com/photo-1581094288338-2314dddb7ece?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
      heading={<>ยกระดับบริการ<br />ซ่อมแอร์ของคุณ</>}
      description="จัดการบริการ ประเมินราคา และติดตามสถานะได้แบบเรียลไทม์ ครบจบในแพลตฟอร์มเดียว"
    >
      <header className="text-center mb-4">
        <h1 className="h3 fw-bolder mb-2" style={{ color: '#003a7a' }}>ยินดีต้อนรับกลับมา</h1>
        <p className="text-muted small">เข้าสู่ระบบเพื่อจัดการบริการของคุณ</p>
      </header>
      <form onSubmit={handleSubmit} onChange={() => setError('')}>
        <AuthField id="loginEmail" label="อีเมล" name="email" type="email" autoComplete="email" />
        <AuthField id="loginPassword" label="รหัสผ่าน" name="password" type="password" autoComplete="current-password" />
        <div className="d-flex justify-content-between align-items-center mb-4 px-1">
          <div className="form-check">
            <input className="form-check-input shadow-none" type="checkbox" id="rememberMe" name="rememberMe" />
            <label className="form-check-label text-muted small fw-semibold" htmlFor="rememberMe">จดจำฉันไว้</label>
          </div>
          <Link to="/forgot-password" className="small fw-bold text-decoration-none" style={{ color: '#0056b3' }}>ลืมรหัสผ่าน?</Link>
        </div>
        <AuthSubmitButton busy={busy}>เข้าสู่ระบบ</AuthSubmitButton>
        {authError && !error && <div className="alert alert-warning py-2 small" role="alert">{authError}</div>}
        {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
        <div className="position-relative mb-4 text-center">
          <hr className="opacity-10" style={{ borderColor: '#003a7a' }} />
          <span className="position-absolute top-50 start-50 translate-middle px-3 text-muted small fw-semibold" style={{ backgroundColor: '#fff' }}>
            เข้าสู่ระบบด้วยช่องทางอื่น
          </span>
        </div>
        <button type="button" disabled className="btn w-100 fw-bold mb-4" style={{ padding: '0.75rem', borderRadius: '1rem', backgroundColor: '#e6f0ff', color: '#0d6efd', border: 'none' }}>
          Google (เร็ว ๆ นี้)
        </button>
        <p className="text-center text-muted small mb-0 fw-semibold">
          ยังไม่มีบัญชี? <Link to="/register" className="text-decoration-none fw-bold ms-1" style={{ color: '#0056b3' }}>ลงทะเบียนที่นี่</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const { register, authError } = useCustomerData();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
    try {
      await register({
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        password,
        confirmPassword,
      });
      navigate('/home', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      image="https://images.unsplash.com/photo-1621905252507-b35492cc74b4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
      heading={<>เริ่มต้นใช้งาน<br />แพลตฟอร์ม</>}
      description="สร้างบัญชีลูกค้าเพื่อจองคิวและติดตามบริการเครื่องปรับอากาศ"
    >
      <header className="text-center mb-4">
        <h1 className="h3 fw-bolder mb-2" style={{ color: '#003a7a' }}>สร้างบัญชีใหม่</h1>
        <p className="text-muted small">กรอกข้อมูลด้านล่างเพื่อลงทะเบียน</p>
      </header>
      <form onSubmit={handleSubmit} onChange={() => setError('')}>
        <AuthField id="registerName" label="ชื่อ - นามสกุล" name="fullName" type="text" autoComplete="name" minLength={2} maxLength={120} />
        <AuthField id="registerPhone" label="เบอร์โทรศัพท์สำหรับติดต่อ" name="phone" type="tel" autoComplete="tel" maxLength={20} />
        <AuthField id="registerEmail" label="อีเมล" name="email" type="email" autoComplete="email" maxLength={254} />
        <AuthField id="registerPassword" label="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)" name="password" type="password" autoComplete="new-password" minLength={6} maxLength={72} />
        <AuthField id="registerConfirmPassword" label="ยืนยันรหัสผ่าน" name="confirmPassword" type="password" autoComplete="new-password" minLength={6} maxLength={72} />
        <AuthSubmitButton busy={busy}>สมัครสมาชิก</AuthSubmitButton>
        {authError && !error && <div className="alert alert-warning py-2 small" role="alert">{authError}</div>}
        {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
        <p className="text-center text-muted small mb-0 fw-semibold">
          มีบัญชีอยู่แล้ว? <Link to="/login" className="text-decoration-none fw-bold ms-1" style={{ color: '#0056b3' }}>เข้าสู่ระบบ</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
