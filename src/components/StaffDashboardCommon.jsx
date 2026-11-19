import { LogoutButton } from './AuthPages';
import { useCustomerData } from './customerContext';
import { Link } from 'react-router-dom';
import TechnicianJobNotifications from './TechnicianJobNotifications';
import ManagerNotifications from './ManagerNotifications';
import './TechnicianTheme.css';

export function Dashboard({ title, subtitle, children }) {
  const { user } = useCustomerData();
  const userName = user?.fullName || user?.name || user?.email || 'ช่างเทคนิค';
  const roleTitle = user?.role === 'technician' ? 'ช่างเทคนิคประจำสาขา'
    : user?.role === 'store_manager' ? 'ผู้จัดการสาขา' : 'ทีมงาน AeroService';

  return (
    <main className="staff-page min-vh-100 pb-5">
      <header className="staff-header py-3 px-3 px-lg-5">
        <div className="container-fluid px-0 d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="staff-brand">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/>
                <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.25"/>
              </svg>
              <span>AeroService</span>
              <span>WORKSPACE</span>
            </div>
            <div className="vr d-none d-sm-block text-white-50 opacity-25" style={{ height: '24px' }}></div>
            <div className="small text-white-50 d-none d-sm-block">
              <span className="text-white fw-semibold">{userName}</span>
              <span className="ms-2 badge bg-white-subtle text-white border border-white-50 rounded-pill" style={{ fontSize: '0.7rem' }}>{roleTitle}</span>
            </div>
          </div>
          <div className="d-flex align-items-center gap-3">
            {user?.role === 'technician' ? (
              <>
                <TechnicianJobNotifications />
                <Link to="/technician/profile" className="staff-user-chip text-decoration-none" aria-label={`เปิดโปรไฟล์ของ ${userName}`}>
                  <div className="staff-user-avatar">{userName.charAt(0)}</div>
                  <span className="small fw-semibold">{userName}</span>
                </Link>
              </>
            ) : (
              user?.role === 'store_manager' ? (
                <>
                  <ManagerNotifications />
                  <Link to="/manager/profile" className="staff-user-chip text-decoration-none" aria-label={`เปิดโปรไฟล์ของ ${userName}`}>
                    <div className="staff-user-avatar">{userName.charAt(0)}</div>
                    <span className="small fw-semibold">{userName}</span>
                  </Link>
                </>
              ) : (
                <div className="staff-user-chip d-none d-md-flex">
                  <div className="staff-user-avatar">{userName.charAt(0)}</div>
                  <span className="small fw-semibold">{userName}</span>
                </div>
              )
            )}
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="staff-container py-4">
        <div className="mb-4 d-flex flex-wrap justify-content-between align-items-end gap-2">
          <div>
            <h1 className="h3 fw-bold mb-1" style={{ color: '#0c2b5e' }}>{title}</h1>
            <p className="text-secondary small mb-0">{subtitle}</p>
          </div>
          <div className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 rounded-pill fw-semibold" style={{ fontSize: '0.78rem' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="me-1">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            ระบบภาคสนาม AeroService Pro
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}

export function ResourceState({ loading, error, onRetry }) {
  if (loading) return <div className="text-center text-secondary py-4" role="status">
    <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
    กำลังโหลดข้อมูลจากระบบ…
  </div>;
  if (error) return <div className="alert alert-danger d-flex justify-content-between align-items-center gap-2 rounded-3 shadow-sm border-0" role="alert">
    <span>{error}</span>{onRetry && <button className="btn btn-sm btn-outline-danger" onClick={onRetry}>ลองอีกครั้ง</button>}
  </div>;
  return null;
}

export function Panel({ title, children, action }) {
  return <section className="card staff-card border-0 mb-4">
    <div className="card-header bg-white border-0 px-3 px-md-4 pt-4 d-flex align-items-center justify-content-between gap-2">
      <h2 className="h5 fw-bold mb-0">{title}</h2>{action}
    </div>
    <div className="card-body px-3 px-md-4 pt-3">{children}</div>
  </section>;
}

export function Empty({ children = 'ไม่มีข้อมูล' }) {
  return <div className="text-center text-secondary py-4">{children}</div>;
}

export function Money({ amount }) {
  return <>{amount == null ? '—' : Number(amount).toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</>;
}

export function StatusBadge({ status }) {
  const statusMap = {
    pending: { label: 'รอดำเนินการ (Pending)', cls: 'pending' },
    traveling: { label: 'กำลังเดินทาง (Traveling)', cls: 'traveling' },
    repairing: { label: 'กำลังปฏิบัติงาน (Repairing)', cls: 'repairing' },
    completed: { label: 'เสร็จสิ้น (Completed)', cls: 'completed' },
    cancelled: { label: 'ยกเลิก (Cancelled)', cls: 'cancelled' },
  };
  const config = statusMap[status] || {
    label: status || '—',
    cls: /paid|approved|completed|active/i.test(status || '') ? 'completed'
      : /reject|cancel|inactive/i.test(status || '') ? 'cancelled' : 'pending',
  };

  return (
    <span className={`badge-status ${config.cls}`}>
      <span>{config.label}</span>
    </span>
  );
}

export function DateRange({ from, to, setFrom, setTo }) {
  return <div className="d-flex flex-wrap gap-2 align-items-center">
    <label className="small text-secondary">ตั้งแต่ <input className="form-control form-control-sm d-inline-block ms-1" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
    <label className="small text-secondary">ถึง <input className="form-control form-control-sm d-inline-block ms-1" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
  </div>;
}

export function MutationFeedback({ mutation }) {
  return <>{mutation.error && <div className="alert alert-danger py-2 mb-2 rounded-3 shadow-sm border-0" role="alert">{mutation.error}</div>}
    {mutation.success && <div className="alert alert-success py-2 mb-2 rounded-3 shadow-sm border-0" role="status">{mutation.success}</div>}</>;
}
