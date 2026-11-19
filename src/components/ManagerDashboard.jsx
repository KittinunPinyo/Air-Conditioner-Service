import { useState } from 'react';
import { Dashboard, Money, MutationFeedback, Panel, ResourceState, StatusBadge } from './StaffDashboardCommon';
import { api, getServiceLabel, useMutation, useResource } from './StaffDashboardUtils';
import { PricingSettingsFields } from './PricingSettingsFields';
import './AdminTheme.css';
import './ManagerTheme.css';

export default function ManagerDashboard() {
  const [refresh, setRefresh] = useState(0);
  const [activeTab, setActiveTab] = useState('operations'); // 'operations' | 'requests' | 'kpi' | 'all'
  const operations = useResource('/manager/operations', refresh);
  const technicians = useResource('/manager/technicians', refresh);
  const requests = useResource('/manager/requests', refresh);
  const kpi = useResource('/manager/kpi', refresh);
  const pricing = useResource('/admin/settings/pricing', refresh);
  const mutation = useMutation();
  const [assignments, setAssignments] = useState({});
  const [notes, setNotes] = useState({});
  const [pricingDraft, setPricingDraft] = useState({ source: null, value: null });
  const pricingSettings = pricingDraft.source === pricing.data ? pricingDraft.value : pricing.data?.settings;
  const setPricingSettings = (update) => setPricingDraft((current) => ({
    source: pricing.data,
    value: typeof update === 'function'
      ? update(current.source === pricing.data ? current.value : pricing.data?.settings)
      : update,
  }));

  const bookingList = operations.data?.bookings || [];
  const requestList = requests.data?.requests || [];
  const activeJobsCount = bookingList.length;
  const unassignedCount = bookingList.filter(
    (b) => !b.technicianId && !['completed', 'cancelled'].includes(b.status)
  ).length;
  const pendingRequestsCount = requestList.filter((r) => r.status === 'pending').length;

  const assign = async (job, technicianId) => {
    if (!technicianId) return;
    if (await mutation.run(() => api(`/manager/bookings/${encodeURIComponent(job.id)}/assign`, {
      method: 'POST', body: JSON.stringify({ technicianId }),
    }), 'มอบหมายช่างเรียบร้อยแล้ว')) setRefresh((value) => value + 1);
  };

  const decide = async (request, decision) => {
    if (await mutation.run(() => api(`/manager/requests/${encodeURIComponent(request.id)}`, {
      method: 'PATCH', body: JSON.stringify({ decision, note: notes[request.id] || '' }),
    }), 'บันทึกผลการพิจารณาแล้ว')) setRefresh((value) => value + 1);
  };

  const savePricing = async (event) => {
    event.preventDefault();
    const settings = Object.fromEntries(Object.entries(pricingSettings || {}).map(([key, value]) => [
      key,
      typeof value === 'object' && value !== null
        ? Object.fromEntries(Object.entries(value).map(([nested, amount]) => [nested, Number(amount)]))
        : Number(value),
    ]));
    if (await mutation.run(
      () => api('/admin/settings/pricing', { method: 'PUT', body: JSON.stringify({ settings }) }),
      'บันทึกการตั้งราคาแล้ว',
    )) setRefresh((value) => value + 1);
  };

  const getTimeSlotLabel = (slot) => {
    if (slot === 'morning') return 'ช่วงเช้า (09:00 - 12:00)';
    if (slot === 'afternoon') return 'ช่วงบ่าย (13:00 - 17:00)';
    return slot || '—';
  };

  const renderJobPrice = (job) => {
    if (job.finalPrice != null) {
      return (
        <div className="mgr-price-tag final">
          <small className="text-muted d-block" style={{ fontSize: '0.72rem' }}>ราคาสุดท้าย</small>
          <Money amount={job.finalPrice} />
        </div>
      );
    }
    const estimate = typeof job.estimatedPrice === 'object' && job.estimatedPrice !== null
      ? job.estimatedPrice
      : { min: Number(job.estimatedPrice || 0), max: Number(job.estimatedPrice || 0) };
    return (
      <div className="mgr-price-tag">
        <small className="text-muted d-block" style={{ fontSize: '0.72rem' }}>ราคาประเมิน</small>
        <Money amount={estimate.min} />
        {estimate.max !== estimate.min && <> – <Money amount={estimate.max} /></>}
      </div>
    );
  };

  // คอมโพเนนต์แผง: ตารางงานและการมอบหมายช่าง
  const renderOperationsPanel = () => (
    <Panel title={
      <div className="d-flex align-items-center justify-content-between w-100 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>ตารางงานและการมอบหมายช่าง</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2.5 py-1 fw-bold" style={{ fontSize: '0.75rem' }}>
            {activeJobsCount} งานทั้งหมด
          </span>
          {unassignedCount > 0 && (
            <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-2.5 py-1 fw-bold" style={{ fontSize: '0.75rem' }}>
              รอจัดช่าง {unassignedCount} งาน
            </span>
          )}
        </div>
      </div>
    }>
      <ResourceState {...operations} onRetry={() => setRefresh((value) => value + 1)} />
      <ResourceState {...technicians} onRetry={() => setRefresh((value) => value + 1)} />
      {operations.data && (bookingList.length ? (
        <div className="mgr-table-wrapper">
          <table className="table mgr-table align-middle">
            <thead>
              <tr>
                <th style={{ width: '25%' }}>งาน / นัดหมาย</th>
                <th style={{ width: '28%' }}>ลูกค้า & สถานที่</th>
                <th style={{ width: '22%' }}>สถานะ & ราคา</th>
                <th style={{ width: '25%' }}>ช่างผู้รับผิดชอบ</th>
              </tr>
            </thead>
            <tbody>
              {bookingList.map((job) => {
                const isLocked = ['repairing', 'completed', 'cancelled'].includes(job.status);
                return (
                  <tr key={job.id}>
                    <td>
                      <span className="mgr-job-badge">#{job.id}</span>
                      <div className="mgr-service-title">{getServiceLabel(job.serviceType, job.issue)}</div>
                      <div className="mgr-datetime-chip">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span>{job.date} · {getTimeSlotLabel(job.timeSlot)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="mgr-customer-name">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                        <span>{job.customerName || '—'}</span>
                      </div>
                      <div className="mgr-address-row">
                        <svg width="13" height="13" className="mt-0.5 flex-shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span>{job.address || '—'}</span>
                      </div>
                      {job.address && (
                        <a className="mgr-address-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`} target="_blank" rel="noreferrer">
                          <span>เปิดแผนที่ Google Maps ↗</span>
                        </a>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={job.status} />
                      {renderJobPrice(job)}
                    </td>
                    <td>
                      <div className="mgr-assign-box">
                        <select
                          className="form-select mgr-tech-select"
                          aria-label={`มอบหมายช่างสำหรับงาน ${job.id}`}
                          value={assignments[job.id] ?? job.technicianId ?? ''}
                          disabled={technicians.loading || mutation.busy || isLocked}
                          onChange={(event) => {
                            setAssignments((current) => ({ ...current, [job.id]: event.target.value }));
                            assign(job, event.target.value);
                          }}
                        >
                          <option value="">— เลือกมอบหมายช่าง —</option>
                          {(technicians.data?.technicians || []).map((tech) => (
                            <option key={tech.id} value={tech.id}>{tech.fullName}</option>
                          ))}
                        </select>
                        {job.technicianName ? (
                          <div className="d-flex align-items-center gap-1 mt-1 text-secondary" style={{ fontSize: '0.785rem' }}>
                            <span className="mgr-tech-status-dot"></span>
                            <span>ช่างปัจจุบัน: <strong className="text-dark">{job.technicianName}</strong></span>
                          </div>
                        ) : (
                          <small className="text-warning d-block mt-1" style={{ fontSize: '0.76rem' }}>
                            ยังไม่ได้มอบหมายช่าง
                          </small>
                        )}
                        {isLocked && (
                          <small className="text-muted d-flex align-items-center gap-1 mt-1" style={{ fontSize: '0.72rem' }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                            <span>งานเริ่มหรือเสร็จแล้ว</span>
                          </small>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mgr-empty-state">
          <div className="mgr-empty-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
            </svg>
          </div>
          <div className="fw-semibold text-dark">ไม่มีงานที่ต้องจัดการในขณะนี้</div>
          <small className="text-muted">ตารางนัดหมายใหม่จากลูกค้าจะแสดงที่นี่โดยอัตโนมัติ</small>
        </div>
      ))}
    </Panel>
  );

  // คอมโพเนนต์แผง: คิวคำขอรออนุมัติ
  const renderRequestsPanel = () => (
    <Panel title={
      <div className="d-flex align-items-center justify-content-between w-100 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 14 14"/>
          </svg>
          <span>คิวคำขอรอการอนุมัติ (ส่วนลด & จัดซื้ออะไหล่)</span>
        </div>
        {pendingRequestsCount > 0 ? (
          <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2.5 py-1 fw-bold" style={{ fontSize: '0.75rem' }}>
            {pendingRequestsCount} รายการรอพิจารณา
          </span>
        ) : (
          <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1 fw-bold" style={{ fontSize: '0.75rem' }}>
            ✓ เคลียร์คำขอครบแล้ว
          </span>
        )}
      </div>
    }>
      <ResourceState {...requests} onRetry={() => setRefresh((value) => value + 1)} />
      {requests.data && (requestList.length ? (
        <div className="mgr-table-wrapper">
          <table className="table mgr-table align-middle">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>ประเภท & งาน</th>
                <th style={{ width: '32%' }}>รายละเอียดคำขอ</th>
                <th style={{ width: '20%' }}>ผู้ยื่นคำขอ & ยอดเงิน</th>
                <th style={{ width: '26%' }}>สถานะ & การพิจารณา</th>
              </tr>
            </thead>
            <tbody>
              {requestList.map((request) => {
                const isReviewed = /approved|reject/i.test(request.status || '');
                return (
                  <tr key={request.id}>
                    <td>
                      <span className={`mgr-req-badge ${request.type === 'purchase' ? 'purchase' : 'discount'}`}>
                        {request.type === 'purchase' ? 'ขอจัดซื้ออะไหล่' : 'ขอส่วนลดลูกค้า'}
                      </span>
                      {request.jobId && <div className="mgr-job-badge mt-1.5">#{request.jobId}</div>}
                      <div className="text-secondary small mt-1" style={{ fontSize: '0.75rem' }}>
                        {request.createdAt ? new Date(request.createdAt).toLocaleDateString('th-TH') : '—'}
                      </div>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{request.description}</div>
                      {request.note && (
                        <div className="mt-1 small bg-light p-1.5 rounded border text-secondary" style={{ fontSize: '0.78rem' }}>
                          <strong>หมายเหตุผู้จัดการ:</strong> {request.note}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{request.requesterName}</div>
                      <div className="fw-bolder text-primary fs-6 mt-0.5">
                        <Money amount={request.amount} />
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={request.status} />
                      {!isReviewed ? (
                        <div className="mt-2">
                          <input
                            className="form-control form-control-sm mb-1.5"
                            placeholder="ระบุหมายเหตุการพิจารณา..."
                            maxLength="500"
                            value={notes[request.id] || ''}
                            onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))}
                          />
                          <div className="d-flex gap-1.5">
                            <button
                              className="btn btn-sm mgr-btn-approve flex-grow-1"
                              disabled={mutation.busy}
                              onClick={() => decide(request, 'approve')}
                            >
                              ✓ อนุมัติ
                            </button>
                            <button
                              className="btn btn-sm mgr-btn-reject flex-grow-1"
                              disabled={mutation.busy}
                              onClick={() => decide(request, 'reject')}
                            >
                              ✕ ปฏิเสธ
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="small text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                          ✓ ดำเนินการพิจารณาแล้ว
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mgr-empty-state">
          <div className="mgr-empty-icon" style={{ background: '#dcfce7', color: '#15803d' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div className="fw-bold text-dark">ไม่มีคำขอรอการพิจารณา</div>
          <small className="text-muted">เมื่อช่างเทคนิคขอส่วนลดหรือขอจัดซื้ออะไหล่ รายการจะปรากฏที่นี่</small>
        </div>
      ))}
    </Panel>
  );

  // คอมโพเนนต์แผง: ตัวชี้วัดและประสิทธิภาพทีมช่าง
  const renderKpiPanel = () => (
    <Panel title={
      <div className="d-flex align-items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V10M12 20V4M6 20v-6"/>
        </svg>
        <span>ตัวชี้วัดและประสิทธิภาพงาน</span>
      </div>
    }>
      <ResourceState {...kpi} onRetry={() => setRefresh((value) => value + 1)} />
      {kpi.data && (
        <>
          {/* การ์ดสถิติ 3 มิติขนาดกะทัดรัด */}
          <div className="mgr-kpi-grid">
            <div className="mgr-kpi-card">
              <div>
                <div className="mgr-kpi-title">งานสำเร็จทั้งหมด</div>
                <div className="mgr-kpi-value">{kpi.data.completedCount ?? 0}</div>
                <div className="mgr-kpi-sub">ปิดงานเรียบร้อยในระบบ</div>
              </div>
              <div className="mgr-kpi-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
            </div>

            <div className="mgr-kpi-card kpi-rating">
              <div>
                <div className="mgr-kpi-title">คะแนนความพึงพอใจเฉลี่ย</div>
                <div className="mgr-kpi-value">
                  {kpi.data.averageRating ? Number(kpi.data.averageRating).toFixed(1) : '—'}
                  <span className="fs-6 text-muted fw-normal"> / 5.0</span>
                </div>
                <div className="mgr-stars mt-0.5">
                  {'★'.repeat(Math.round(Number(kpi.data.averageRating) || 0))}
                  {'☆'.repeat(5 - Math.round(Number(kpi.data.averageRating) || 0))}
                </div>
              </div>
              <div className="mgr-kpi-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
            </div>

            <div className="mgr-kpi-card kpi-reviews">
              <div>
                <div className="mgr-kpi-title">รีวิวจากลูกค้า</div>
                <div className="mgr-kpi-value">{kpi.data.reviewCount ?? 0}</div>
                <div className="mgr-kpi-sub">ความคิดเห็นที่บันทึกแล้ว</div>
              </div>
              <div className="mgr-kpi-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* จัดวาง 2 คอลัมน์เคียงข้างกัน: ซ้ายเป็นประสิทธิภาพช่าง, ขวาเป็นรีวิวลูกค้า */}
          <div className="row g-3">
            <div className="col-12 col-lg-7">
              <h3 className="h6 fw-bold mb-2.5 d-flex align-items-center gap-1.5" style={{ color: '#0c2b5e' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>ประสิทธิภาพช่างเทคนิคแต่ละคน</span>
              </h3>
              <div className="mgr-table-wrapper">
                <table className="table mgr-table align-middle">
                  <thead>
                    <tr>
                      <th>ช่างเทคนิค</th>
                      <th>งานที่ปิดสำเร็จ</th>
                      <th>คะแนนเฉลี่ย</th>
                      <th>ความพึงพอใจ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(kpi.data.technicians || []).map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="mgr-tech-avatar" style={{ width: '30px', height: '30px', fontSize: '0.8rem' }}>
                              {item.name ? item.name.charAt(0).toUpperCase() : 'T'}
                            </div>
                            <div>
                              <strong className="text-dark small">{item.name}</strong>
                              <div className="text-muted" style={{ fontSize: '0.72rem' }}>รหัส: {item.id}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-0.5 fw-bold" style={{ fontSize: '0.75rem' }}>
                            {item.completedCount ?? 0} งาน
                          </span>
                        </td>
                        <td>
                          <strong className="text-dark small">
                            {item.averageRating ? Number(item.averageRating).toFixed(1) : '—'}
                          </strong>
                          <span className="text-muted" style={{ fontSize: '0.72rem' }}> / 5.0</span>
                        </td>
                        <td>
                          <span className="mgr-stars">
                            {'★'.repeat(Math.round(Number(item.averageRating) || 0))}
                            {'☆'.repeat(5 - Math.round(Number(item.averageRating) || 0))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="col-12 col-lg-5">
              <h3 className="h6 fw-bold mb-2.5 d-flex align-items-center gap-1.5" style={{ color: '#0c2b5e' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
                <span>ความคิดเห็นจากลูกค้าล่าสุด</span>
              </h3>
              {kpi.data.reviews?.length ? (
                <div className="mgr-review-grid">
                  {kpi.data.reviews.map((review, index) => (
                    <article className="mgr-review-card" key={`${review.jobId}-${review.createdAt || index}`}>
                      <div className="d-flex justify-content-between align-items-center mb-1.5">
                        <div className="d-flex align-items-center gap-1.5">
                          <span className="mgr-job-badge mb-0">#{review.jobId}</span>
                          <strong className="small text-dark">{review.customerName || 'ลูกค้า'}</strong>
                        </div>
                        <span className="mgr-stars" aria-label={`${review.rating} จาก 5 ดาว`}>
                          {'★'.repeat(Math.max(0, Math.min(5, Number(review.rating) || 0)))}
                          {'☆'.repeat(5 - Math.max(0, Math.min(5, Number(review.rating) || 0)))}
                        </span>
                      </div>
                      <p className="small text-secondary mb-2 flex-grow-1" style={{ lineHeight: '1.4', fontSize: '0.825rem' }}>
                        "{review.comment || 'ไม่มีข้อความเพิ่มเติม'}"
                      </p>
                      <div className="d-flex justify-content-between align-items-center text-muted border-top pt-1.5 mt-auto" style={{ fontSize: '0.74rem' }}>
                        <span>ช่าง: <strong className="text-dark">{review.technicianName || '—'}</strong></span>
                        <span>{review.createdAt ? new Date(review.createdAt).toLocaleDateString('th-TH') : ''}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mgr-empty-state h-100 d-flex flex-column align-items-center justify-content-center py-4">
                  <div className="mgr-empty-icon mb-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <div className="fw-semibold text-dark small">ยังไม่มีรีวิวจากลูกค้า</div>
                  <small className="text-muted" style={{ fontSize: '0.74rem' }}>เมื่อช่างปิดงานและลูกค้าให้คะแนน จะแสดงที่นี่</small>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Panel>
  );

  const renderPricingPanel = () => (
    <Panel title="ตั้งค่าราคาและคอมมิชชัน">
      <ResourceState {...pricing} onRetry={() => setRefresh((value) => value + 1)} />
      {pricingSettings && (
        <form onSubmit={savePricing}>
          <p className="admin-pricing-description">กรอกราคาบริการเป็นบาท และกำหนดอัตราคอมมิชชันเป็นเปอร์เซ็นต์</p>
          <PricingSettingsFields settings={pricingSettings} setSettings={setPricingSettings} />
          <div className="d-flex justify-content-end mt-4">
            <button className="btn btn-primary admin-save-button" disabled={mutation.busy}>บันทึกการตั้งค่า</button>
          </div>
        </form>
      )}
    </Panel>
  );

  return (
    <Dashboard title="จัดการปฏิบัติการ" subtitle="กระจายงานช่าง ดูแลคำขออนุมัติ และติดตามคุณภาพบริการ">
      <MutationFeedback mutation={mutation} />

      {/* แถบสรุปด่วนด้านบน (Quick Stats Ribbon) - ประหยัดพื้นที่ในแนวตั้ง */}
      <div className="mgr-quick-bar">
        <div className="mgr-quick-item">
          <span className="mgr-quick-dot bg-primary"></span>
          <span className="mgr-quick-label">งานทั้งหมด:</span>
          <strong className="mgr-quick-val">{activeJobsCount} งาน</strong>
        </div>
        <div className="mgr-quick-item">
          <span className={`mgr-quick-dot ${unassignedCount > 0 ? 'bg-warning' : 'bg-success'}`}></span>
          <span className="mgr-quick-label">รอจัดช่าง:</span>
          <strong className={`mgr-quick-val ${unassignedCount > 0 ? 'text-warning-emphasis' : 'text-success'}`}>
            {unassignedCount} งาน
          </strong>
        </div>
        <div className="mgr-quick-item">
          <span className={`mgr-quick-dot ${pendingRequestsCount > 0 ? 'bg-danger' : 'bg-secondary'}`}></span>
          <span className="mgr-quick-label">คำขอรออนุมัติ:</span>
          <strong className={`mgr-quick-val ${pendingRequestsCount > 0 ? 'text-danger' : 'text-muted'}`}>
            {pendingRequestsCount} รายการ
          </strong>
        </div>
        <div className="mgr-quick-item">
          <span className="mgr-quick-dot bg-success"></span>
          <span className="mgr-quick-label">งานสำเร็จ:</span>
          <strong className="mgr-quick-val text-success">{kpi.data?.completedCount ?? 0} งาน</strong>
        </div>
        <div className="mgr-quick-item">
          <span className="mgr-quick-dot" style={{ backgroundColor: '#f59e0b' }}></span>
          <span className="mgr-quick-label">คะแนนเฉลี่ย:</span>
          <strong className="mgr-quick-val text-dark">
            {kpi.data?.averageRating ? Number(kpi.data?.averageRating).toFixed(1) : '—'} ★
          </strong>
        </div>
      </div>

      {/* ปุ่มสลับแท็บเมนู (Tab Switcher) - ไม่ต้องเลื่อนลงยาว สามารถกดเลือกดูได้ทันที */}
      <div className="mgr-tabs-container">
        <div className="mgr-tabs">
          <button
            type="button"
            className={`mgr-tab-btn ${activeTab === 'operations' ? 'active' : ''}`}
            onClick={() => setActiveTab('operations')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>ตารางงาน & มอบหมายช่าง</span>
            <span className="mgr-tab-pill">{activeJobsCount}</span>
            {unassignedCount > 0 && <span className="mgr-tab-pill warning">{unassignedCount} รอจัด</span>}
          </button>

          <button
            type="button"
            className={`mgr-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 14 14"/>
            </svg>
            <span>คิวคำขอรออนุมัติ</span>
            {pendingRequestsCount > 0 ? (
              <span className="mgr-tab-pill danger">{pendingRequestsCount} รอพิจารณา</span>
            ) : (
              <span className="mgr-tab-pill">0</span>
            )}
          </button>

          <button
            type="button"
            className={`mgr-tab-btn ${activeTab === 'kpi' ? 'active' : ''}`}
            onClick={() => setActiveTab('kpi')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20V10M12 20V4M6 20v-6"/>
            </svg>
            <span>ตัวชี้วัด & ประสิทธิภาพทีมช่าง</span>
            <span className="mgr-tab-pill">{kpi.data?.technicians?.length || 0} ช่าง</span>
          </button>

          <button
            type="button"
            className={`mgr-tab-btn ${activeTab === 'pricing' ? 'active' : ''}`}
            onClick={() => setActiveTab('pricing')}
          >
            <span className="mgr-pricing-tab-icon" aria-hidden="true">฿</span>
            <span>ราคาและคอมมิชชัน</span>
          </button>

          <button
            type="button"
            className={`mgr-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            <span>แสดงทั้งหมด</span>
          </button>
        </div>
      </div>

      {/* เนื้อหาตามแท็บที่เลือก */}
      {activeTab === 'operations' && renderOperationsPanel()}
      {activeTab === 'requests' && renderRequestsPanel()}
      {activeTab === 'kpi' && renderKpiPanel()}
      {activeTab === 'pricing' && renderPricingPanel()}
      {activeTab === 'all' && (
        <>
          {renderOperationsPanel()}
          {renderRequestsPanel()}
          {renderKpiPanel()}
          {renderPricingPanel()}
        </>
      )}
    </Dashboard>
  );
}
