import { LogoutButton } from './AuthPages';
import { useCustomerData } from './customerContext';

export function Dashboard({ title, subtitle, children }) {
  const { user } = useCustomerData();
  return (
    <main className="staff-page min-vh-100">
      <header className="staff-header">
        <div className="container-fluid px-3 px-lg-5 py-3 d-flex align-items-center justify-content-between gap-3">
          <div>
            <div className="staff-brand">AeroService <span>WORKSPACE</span></div>
            <div className="small text-white-50">{user?.fullName || user?.name || user?.email || ''}</div>
          </div>
          <LogoutButton />
        </div>
      </header>
      <div className="container-fluid px-3 px-lg-5 py-4">
        <div className="mb-4">
          <h1 className="h3 fw-bold mb-1">{title}</h1>
          <p className="text-secondary mb-0">{subtitle}</p>
        </div>
        {children}
      </div>
    </main>
  );
}

export function ResourceState({ loading, error, onRetry }) {
  if (loading) return <div className="text-center text-secondary py-4" role="status">กำลังโหลดข้อมูลจากระบบ…</div>;
  if (error) return <div className="alert alert-danger d-flex justify-content-between align-items-center gap-2" role="alert">
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
  const tone = /paid|approved|completed|active/i.test(status || '') ? 'success'
    : /reject|cancel|inactive/i.test(status || '') ? 'danger'
      : 'warning';
  return <span className={`badge text-bg-${tone}`}>{status || '—'}</span>;
}

export function DateRange({ from, to, setFrom, setTo }) {
  return <div className="d-flex flex-wrap gap-2 align-items-center">
    <label className="small text-secondary">ตั้งแต่ <input className="form-control form-control-sm d-inline-block ms-1" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
    <label className="small text-secondary">ถึง <input className="form-control form-control-sm d-inline-block ms-1" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
  </div>;
}

export function MutationFeedback({ mutation }) {
  return <>{mutation.error && <div className="alert alert-danger py-2 mb-2" role="alert">{mutation.error}</div>}
    {mutation.success && <div className="alert alert-success py-2 mb-2" role="status">{mutation.success}</div>}</>;
}
