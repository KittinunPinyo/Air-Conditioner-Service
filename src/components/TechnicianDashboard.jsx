import { useState } from 'react';
import { Dashboard, Empty, Money, MutationFeedback, Panel, ResourceState, StatusBadge } from './StaffDashboardCommon';
import { api, useMutation, useResource } from './StaffDashboardUtils';
import './TechnicianTheme.css';

export default function TechnicianDashboard() {
  const [refresh, setRefresh] = useState(0);
  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs' | 'earnings' | 'requests' | 'all'
  const tasks = useResource('/technician/tasks', refresh);
  const earnings = useResource('/technician/earnings', refresh);
  const taskList = tasks.data?.tasks || [];
  const mutation = useMutation();
  const [evidenceType, setEvidenceType] = useState({});
  const [finalPrices, setFinalPrices] = useState({});
  const [completionRanges, setCompletionRanges] = useState({});

  const inProgressCount = taskList.filter((j) => j.status === 'traveling' || j.status === 'repairing').length;
  const pendingCount = taskList.filter((j) => j.status === 'pending').length;

  const updateStatus = async (job, status) => {
    if (await mutation.run(() => api(`/technician/tasks/${encodeURIComponent(job.id)}/status`, {
      method: 'PATCH', body: JSON.stringify({ status }),
    }), 'อัปเดตสถานะงานแล้ว')) setRefresh((value) => value + 1);
  };

  const completeJob = async (event, job, range) => {
    event.preventDefault();
    const finalPrice = Number(finalPrices[job.id] ?? range.min);
    if (!Number.isSafeInteger(finalPrice) || finalPrice < range.min || finalPrice > range.max) {
      await mutation.run(() => Promise.reject(new Error(`ราคาสุดท้ายต้องอยู่ระหว่าง ${range.min.toLocaleString()} ถึง ${range.max.toLocaleString()} บาท`)));
      return;
    }
    const evidenceTypes = new Set((job.evidence || []).map((item) => item.type));
    if (!evidenceTypes.has('before') || !evidenceTypes.has('after')) {
      await mutation.run(() => Promise.reject(new Error('กรุณาอัปโหลดรูปก่อนและหลังปฏิบัติงานก่อนปิดงาน')));
      return;
    }
    if (await mutation.run(async () => {
      try {
        return await api(`/technician/tasks/${encodeURIComponent(job.id)}/complete`, {
          method: 'POST',
          body: JSON.stringify({ finalPrice }),
        });
      } catch (requestError) {
        const allowedRange = requestError.message.match(/อยู่ระหว่าง ([\d,]+) ถึง ([\d,]+)/);
        if (allowedRange) {
          setCompletionRanges((current) => ({
            ...current,
            [job.id]: { min: Number(allowedRange[1].replace(/,/g, '')), max: Number(allowedRange[2].replace(/,/g, '')) },
          }));
        }
        throw requestError;
      }
    }, 'ปิดงานเรียบร้อย')) setRefresh((value) => value + 1);
  };

  const addAddon = async (event, jobId) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (await mutation.run(() => api(`/technician/tasks/${encodeURIComponent(jobId)}/addons`, {
      method: 'POST', body: JSON.stringify({ description: form.get('description'), amount: Number(form.get('amount')) }),
    }), 'ส่งรายการค่าใช้จ่ายเพิ่มเติมแล้ว')) {
      formElement.reset();
      setRefresh((value) => value + 1);
    }
  };

  const uploadEvidence = async (event, jobId) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (!form.get('file')?.size) return;
    if (await mutation.run(() => api(`/technician/tasks/${encodeURIComponent(jobId)}/evidence`, { method: 'POST', body: form }), 'อัปโหลดหลักฐานแล้ว')) {
      formElement.reset();
      setRefresh((value) => value + 1);
    }
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (await mutation.run(() => api('/technician/requests', {
      method: 'POST',
      body: JSON.stringify({
        type: form.get('type'),
        jobId: form.get('jobId') || undefined,
        description: form.get('description'),
        amount: Number(form.get('amount')),
      }),
    }), 'ส่งคำขอให้ผู้จัดการแล้ว')) {
      formElement.reset();
      setRefresh((value) => value + 1);
    }
  };

  // แผงงานของฉัน (Work Orders)
  const renderJobsSection = () => (
    <>
      <ResourceState {...tasks} onRetry={() => setRefresh((value) => value + 1)} />
      {!tasks.loading && !tasks.error && taskList.length === 0 && (
        <Panel title="งานวันนี้">
          <Empty>ยังไม่มีงานที่ได้รับมอบหมายในขณะนี้</Empty>
        </Panel>
      )}
      {taskList.map((job) => {
        const estimate = typeof job.estimatedPrice === 'object'
          ? job.estimatedPrice
          : { min: Number(job.estimatedPrice || 0), max: Number(job.estimatedPrice || 0) };
        const approvedAddons = (job.addons || [])
          .filter((item) => item.status === 'approved')
          .reduce((total, item) => total + Number(item.amount || 0), 0);
        const estimatedRange = {
          min: Math.max(0, Number(estimate.min || 0) + approvedAddons),
          max: Math.max(0, Number(estimate.max ?? estimate.min ?? 0) + approvedAddons),
        };
        const taskPriceRange = job.priceRange
          && Number.isFinite(Number(job.priceRange.min))
          && Number.isFinite(Number(job.priceRange.max))
          && Number(job.priceRange.max) >= Number(job.priceRange.min)
          ? { min: Number(job.priceRange.min), max: Number(job.priceRange.max) }
          : null;
        const range = taskPriceRange || completionRanges[job.id] || estimatedRange;
        const evidenceTypes = new Set((job.evidence || []).map((item) => item.type));
        const canComplete = evidenceTypes.has('before') && evidenceTypes.has('after');
        const beforePhoto = (job.evidence || []).find((item) => item.type === 'before');
        const afterPhoto = (job.evidence || []).find((item) => item.type === 'after');

        return (
          <article className="tech-job-card mb-3" key={job.id}>
            {/* Header แถบด้านบน */}
            <header className="tech-job-header py-2 px-3">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="tech-job-id-pill">#{job.id}</span>
                <span className="tech-job-service-tag small">
                  {job.serviceType === 'install' ? 'งานติดตั้ง / ย้ายแอร์' : job.issue === 'clean' ? 'งานล้างแอร์' : 'งานซ่อมแอร์'}
                </span>
                <span className="tech-job-time-chip" style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>{job.date || '—'} {job.timeSlot === 'morning' ? '(ช่วงเช้า 09:00 - 12:00)' : job.timeSlot === 'afternoon' ? '(ช่วงบ่าย 13:00 - 17:00)' : job.timeSlot || ''}</span>
                </span>
              </div>
              <StatusBadge status={job.status} />
            </header>

            {/* เนื้อหาด้านในการ์ด: 3 คอลัมน์กะทัดรัดแนวนอน */}
            <div className="tech-job-body py-2 px-3">
              <div className="row g-2">
                {/* คอลัมน์ 1: ลูกค้า, ที่อยู่, สเปก, ราคาประเมิน */}
                <div className="col-12 col-lg-5">
                  <div className="tech-sub-panel h-100 p-2.5">
                    <div className="tech-panel-header py-0.5 mb-1.5" style={{ fontSize: '0.78rem' }}>
                      <div className="d-flex align-items-center gap-1.5">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                        <span>ข้อมูลลูกค้า & เครื่อง</span>
                      </div>
                    </div>

                    <div className="tech-contact-row mb-1">
                      <div className="d-flex align-items-center gap-1.5 flex-grow-1">
                        <span className="text-muted small">ลูกค้า:</span>
                        <strong className="text-dark small">{job.customer?.name || '—'}</strong>
                      </div>
                      {job.customer?.phone && (
                        <a href={`tel:${job.customer.phone}`} className="badge bg-success-subtle text-success border border-success-subtle text-decoration-none rounded-pill px-2 py-0.5 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                          </svg>
                          <span>{job.customer.phone}</span>
                        </a>
                      )}
                    </div>

                    <div className="tech-location-row mb-1.5">
                      <svg width="12" height="12" className="mt-0.5 flex-shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      <div className="flex-grow-1">
                        <div className="text-dark small lh-sm">{job.address || '—'}</div>
                        {job.address && (
                          <a className="tech-maps-btn mt-1 py-0 px-2" style={{ fontSize: '0.72rem' }} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`} target="_blank" rel="noreferrer">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                            </svg>
                            <span>นำทาง Google Maps</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="tech-spec-bar mb-1.5">
                      <span className="tech-spec-badge py-0.5 px-1.5" style={{ fontSize: '0.72rem' }}>
                        {job.acType === 'wall' ? 'แอร์ติดผนัง' : 'แอร์แขวน/ตั้งพื้น'}
                      </span>
                      <span className="tech-spec-badge py-0.5 px-1.5" style={{ fontSize: '0.72rem' }}>
                        {job.btu ? `${Number(job.btu).toLocaleString()} BTU` : '— BTU'}
                      </span>
                      {job.issue && (
                        <span className="tech-spec-badge warning py-0.5 px-1.5" style={{ fontSize: '0.72rem' }}>
                          {job.issue === 'clean' ? 'ล้างแอร์' : job.issue === 'not_cold' ? 'แอร์ไม่เย็น' : job.issue === 'leaking' ? 'น้ำหยด' : job.issue === 'not_working' ? 'เปิดไม่ติด' : job.issue}
                        </span>
                      )}
                    </div>

                    <div className="tech-price-box mt-auto p-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="tech-price-title" style={{ fontSize: '0.7rem' }}>ราคาประเมิน</div>
                          <div className="tech-price-main fs-6">
                            <Money amount={estimate.min} />{estimate.max !== estimate.min && <> – <Money amount={estimate.max} /></>}
                          </div>
                        </div>
                        {job.status === 'repairing' && (
                          <div className="text-end">
                            <div className="tech-price-title text-primary fw-bold" style={{ fontSize: '0.7rem' }}>ช่วงที่อนุมัติ</div>
                            <div className="fw-bolder text-primary fs-6">
                              <Money amount={range.min} /> – <Money amount={range.max} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* คอลัมน์ 2: หลักฐานภาพถ่าย (Before / After) */}
                <div className="col-12 col-md-6 col-lg-4">
                  <div className="tech-sub-panel h-100 p-2.5">
                    <div className="tech-panel-header py-0.5 mb-1.5" style={{ fontSize: '0.78rem' }}>
                      <div className="d-flex align-items-center gap-1.5">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                        <span>หลักฐานภาพถ่าย</span>
                      </div>
                      <span className="badge bg-primary-subtle text-primary rounded-pill px-1.5 py-0.5" style={{ fontSize: '0.68rem' }}>
                        {job.evidence?.length || 0} รูป
                      </span>
                    </div>

                    <div className="tech-evidence-grid mb-1.5" style={{ gap: '0.45rem' }}>
                      <div className={`tech-evidence-tile py-1 px-1 ${beforePhoto ? 'uploaded' : ''}`}>
                        <div className="tech-evidence-tile-lbl" style={{ fontSize: '0.7rem' }}>รูปก่อนทำงาน</div>
                        {beforePhoto ? (
                          <div>
                            <span className="tech-evidence-tile-status ready" style={{ fontSize: '0.68rem' }}>อัปโหลดแล้ว</span>
                            <div className="mt-0.5">
                              <a href={beforePhoto.url} target="_blank" rel="noreferrer" className="tech-evidence-link py-0 px-1" style={{ fontSize: '0.68rem' }}>
                                ดูรูป ↗
                              </a>
                            </div>
                          </div>
                        ) : (
                          <span className="tech-evidence-tile-status missing" style={{ fontSize: '0.68rem' }}>ยังไม่อัปโหลด</span>
                        )}
                      </div>

                      <div className={`tech-evidence-tile py-1 px-1 ${afterPhoto ? 'uploaded' : ''}`}>
                        <div className="tech-evidence-tile-lbl" style={{ fontSize: '0.7rem' }}>รูปหลังทำงาน</div>
                        {afterPhoto ? (
                          <div>
                            <span className="tech-evidence-tile-status ready" style={{ fontSize: '0.68rem' }}>อัปโหลดแล้ว</span>
                            <div className="mt-0.5">
                              <a href={afterPhoto.url} target="_blank" rel="noreferrer" className="tech-evidence-link py-0 px-1" style={{ fontSize: '0.68rem' }}>
                                ดูรูป ↗
                              </a>
                            </div>
                          </div>
                        ) : (
                          <span className="tech-evidence-tile-status missing" style={{ fontSize: '0.68rem' }}>ยังไม่อัปโหลด</span>
                        )}
                      </div>
                    </div>

                    <form onSubmit={(event) => uploadEvidence(event, job.id)} className="tech-upload-strip mt-auto p-1.5">
                      <div className="d-flex align-items-center gap-1 w-100 flex-wrap">
                        <select
                          className="form-select form-select-sm fw-semibold py-0 px-1.5"
                          style={{ width: 'auto', fontSize: '0.75rem' }}
                          name="type"
                          value={evidenceType[job.id] || (beforePhoto ? 'after' : 'before')}
                          onChange={(event) => setEvidenceType((current) => ({ ...current, [job.id]: event.target.value }))}
                        >
                          <option value="before">ก่อนทำ</option>
                          <option value="after">หลังทำ</option>
                        </select>
                        <input className="form-control form-control-sm flex-grow-1 py-0 px-1" style={{ fontSize: '0.72rem' }} type="file" name="file" accept="image/*" required />
                        <button className="btn btn-sm btn-primary rounded-3 px-2 py-0.5 fw-bold" style={{ fontSize: '0.75rem' }} disabled={mutation.busy}>
                          อัปโหลด
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* คอลัมน์ 3: รายการเพิ่มเติม & อะไหล่ */}
                <div className="col-12 col-md-6 col-lg-3">
                  <div className="tech-sub-panel h-100 p-2.5">
                    <div className="tech-panel-header py-0.5 mb-1.5" style={{ fontSize: '0.78rem' }}>
                      <div className="d-flex align-items-center gap-1.5">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        <span>อะไหล่ & รายการเพิ่ม</span>
                      </div>
                      <span className="badge bg-primary-subtle text-primary rounded-pill px-1.5 py-0.5" style={{ fontSize: '0.68rem' }}>
                        {job.addons?.length || 0}
                      </span>
                    </div>

                    <div className="tech-addons-box mb-1.5 p-1.5" style={{ maxHeight: '80px', overflowY: 'auto' }}>
                      {job.addons?.length ? (
                        job.addons.map((item, index) => (
                          <div className="tech-addon-item py-0.5" key={`${item.description}-${index}`}>
                            <div className="d-flex align-items-center gap-1 text-truncate">
                              <span className="fw-semibold text-dark small text-truncate" style={{ fontSize: '0.76rem' }}>{item.description}</span>
                              <span className={`badge ${item.status === 'approved' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`} style={{ fontSize: '0.62rem' }}>
                                {item.status === 'approved' ? 'อนุมัติ' : 'รอ'}
                              </span>
                            </div>
                            <span className="fw-bold text-dark small" style={{ fontSize: '0.76rem' }}><Money amount={item.amount} /></span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-muted py-1" style={{ fontSize: '0.74rem' }}>
                          ไม่มีรายการเพิ่ม
                        </div>
                      )}
                    </div>

                    <form className="row g-1 mt-auto" onSubmit={(event) => addAddon(event, job.id)}>
                      <div className="col-7">
                        <input className="form-control form-control-sm py-0.5 px-1.5" style={{ fontSize: '0.74rem' }} name="description" placeholder="อะไหล่/งาน" required />
                      </div>
                      <div className="col-5">
                        <input className="form-control form-control-sm py-0.5 px-1.5" style={{ fontSize: '0.74rem' }} name="amount" type="number" min="0" step="0.01" placeholder="บาท" required />
                      </div>
                      <div className="col-12">
                        <button className="btn btn-sm btn-outline-primary w-100 fw-semibold rounded-3 py-0.5" style={{ fontSize: '0.72rem' }} disabled={mutation.busy}>
                          + ขออนุมัติรายการเพิ่ม
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>

            {/* แถบ Action Footer ด้านล่าง */}
            {job.status === 'pending' && (
              <footer className="tech-job-footer py-2 px-3">
                <button className="tech-cta-travel py-1.5 px-3" disabled={mutation.busy} onClick={() => updateStatus(job, 'traveling')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13"/>
                    <polygon points="16 8 20 8 23 11 23 16 16 8"/>
                    <circle cx="5.5" cy="18.5" r="2.5"/>
                    <circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                  <span>เริ่มออกเดินทางไปหาลูกค้า</span>
                </button>
              </footer>
            )}

            {job.status === 'traveling' && (
              <footer className="tech-job-footer py-2 px-3">
                <button className="tech-cta-work py-1.5 px-3" disabled={mutation.busy} onClick={() => updateStatus(job, 'repairing')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                  </svg>
                  <span>ถึงหน้างานแล้ว · เริ่มปฏิบัติงาน</span>
                </button>
              </footer>
            )}

            {job.status === 'repairing' && (
              <footer className="tech-job-footer py-2 px-3">
                <div className="tech-close-bar p-2">
                  <div className="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-1.5">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      <strong className="text-success-emphasis" style={{ fontSize: '0.82rem' }}>บันทึกปิดงานและสรุปค่าบริการ</strong>
                    </div>
                    <div className="d-flex gap-1.5">
                      <span className={`tech-checklist-badge py-0 px-2 ${evidenceTypes.has('before') ? 'ready' : 'missing'}`} style={{ fontSize: '0.68rem' }}>
                        {evidenceTypes.has('before') ? '✓ รูปก่อนทำ' : '✕ ขาดรูปก่อน'}
                      </span>
                      <span className={`tech-checklist-badge py-0 px-2 ${evidenceTypes.has('after') ? 'ready' : 'missing'}`} style={{ fontSize: '0.68rem' }}>
                        {evidenceTypes.has('after') ? '✓ รูปหลังทำ' : '✕ ขาดรูปหลัง'}
                      </span>
                    </div>
                  </div>

                  <form className="row g-2 align-items-end" onSubmit={(event) => completeJob(event, job, range)}>
                    <div className="col-12 col-sm-8">
                      <label className="form-label small text-muted mb-0.5 fw-semibold" style={{ fontSize: '0.74rem' }}>
                        ราคาสุดท้าย (บาท) <span className="text-secondary fw-normal">กำหนด: {range.min.toLocaleString()} – {range.max.toLocaleString()} ฿</span>
                      </label>
                      <input
                        className="form-control form-control-sm fw-bold py-1"
                        type="number"
                        min={range.min}
                        max={range.max}
                        step="1"
                        required
                        value={finalPrices[job.id] ?? range.min}
                        onChange={(event) => setFinalPrices((current) => ({ ...current, [job.id]: event.target.value }))}
                      />
                    </div>
                    <div className="col-12 col-sm-4">
                      <button className="btn tech-btn-close w-100 py-1" disabled={mutation.busy || !canComplete} style={{ fontSize: '0.85rem' }}>
                        ✓ ปิดงานบริการ
                      </button>
                    </div>
                  </form>
                  {!canComplete && (
                    <p className="small text-danger mt-1 mb-0 d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <span>ต้องอัปโหลดภาพถ่ายทั้งก่อนและหลังทำงานให้ครบก่อน จึงจะกดปิดงานได้</span>
                    </p>
                  )}
                </div>
              </footer>
            )}
          </article>
        );
      })}
    </>
  );

  // แผงส่งคำขอให้ผู้จัดการ
  const renderRequestsSection = () => (
    <Panel title={
      <div className="d-flex align-items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>ส่งคำขอไปที่ผู้จัดการ (ส่วนลด / อนุมัติจัดซื้อ)</span>
      </div>
    }>
      <form className="row g-3 align-items-end" onSubmit={submitRequest}>
        <div className="col-12 col-sm-6 col-lg-3">
          <label className="form-label small fw-semibold text-dark mb-1">ประเภทคำขอ</label>
          <select className="form-select" name="type" defaultValue="discount">
            <option value="discount">ขอส่วนลดให้ลูกค้า</option>
            <option value="purchase">ขออนุมัติจัดซื้ออะไหล่</option>
          </select>
        </div>
        <div className="col-12 col-sm-6 col-lg-2">
          <label className="form-label small fw-semibold text-dark mb-1">งานที่เกี่ยวข้อง</label>
          <select className="form-select" name="jobId" defaultValue="">
            <option value="">ไม่ระบุงาน</option>
            {taskList.map((job) => (
              <option key={job.id} value={job.id}>
                #{job.id} · {job.serviceType === 'install' ? 'ติดตั้ง' : job.issue === 'clean' ? 'ล้างแอร์' : 'ซ่อม'}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-sm-6 col-lg-4">
          <label className="form-label small fw-semibold text-dark mb-1">รายละเอียดคำขอ</label>
          <input className="form-control" name="description" placeholder="ระบุเหตุผลหรือรายการอะไหล่..." required maxLength="500" />
        </div>
        <div className="col-6 col-sm-3 col-lg-2">
          <label className="form-label small fw-semibold text-dark mb-1">จำนวนเงิน (บาท)</label>
          <input className="form-control" name="amount" type="number" min="0" step="1" placeholder="0" required />
        </div>
        <div className="col-6 col-sm-3 col-lg-1 d-grid">
          <button className="btn btn-primary fw-bold" disabled={mutation.busy} style={{ minHeight: '44px' }}>
            ส่งคำขอ
          </button>
        </div>
      </form>
    </Panel>
  );

  // แผงรายได้และคอมมิชชัน
  const renderEarningsSection = () => (
    <Panel title={
      <div className="d-flex align-items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
        <span>รายได้และค่าคอมมิชชัน</span>
      </div>
    }>
      <ResourceState {...earnings} onRetry={() => setRefresh((value) => value + 1)} />
      {earnings.data && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-4">
              <div className="staff-stat">
                <small>รายได้วันนี้ (Daily)</small>
                <strong><Money amount={earnings.data.daily} /></strong>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="staff-stat">
                <small>รายได้เดือนนี้ (Monthly)</small>
                <strong><Money amount={earnings.data.monthly} /></strong>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="staff-stat">
                <small>อัตราค่าคอมมิชชัน</small>
                <strong className="text-primary">{earnings.data.commissionRate ?? '—'}%</strong>
              </div>
            </div>
          </div>
          <div className="table-responsive rounded-3 border overflow-hidden">
            <table className="table align-middle mb-0 tech-earnings-table">
              <thead className="table-light">
                <tr>
                  <th>รหัสงาน</th>
                  <th>วันที่จ่าย</th>
                  <th>ยอดงานรวม</th>
                  <th>คอมมิชชันที่ได้รับ</th>
                </tr>
              </thead>
              <tbody>
                {(earnings.data.items || []).map((item) => (
                  <tr key={`${item.jobId}-${item.paidAt}`}>
                    <td><span className="tech-job-id-pill">#{item.jobId}</span></td>
                    <td className="text-secondary small">{item.paidAt || '—'}</td>
                    <td className="fw-semibold"><Money amount={item.amount} /></td>
                    <td className="fw-bold text-success"><Money amount={item.commission} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!earnings.data.items?.length && <Empty>ยังไม่มีรายการรายได้ที่บันทึก</Empty>}
        </>
      )}
    </Panel>
  );

  return (
    <Dashboard title="งานของฉัน" subtitle="ตารางงานภาคสนาม สถานะบริการ และรายได้ค่าคอมมิชชัน">
      <MutationFeedback mutation={mutation} />

      {/* แถบสรุปด่วนด้านบน (Quick Stats Ribbon) */}
      <div className="tech-quick-bar">
        <div className="tech-quick-item">
          <span className="tech-quick-dot bg-primary"></span>
          <span className="tech-quick-label">งานทั้งหมด:</span>
          <strong className="tech-quick-val">{taskList.length} งาน</strong>
        </div>
        <div className="tech-quick-item">
          <span className={`tech-quick-dot ${inProgressCount > 0 ? 'bg-info' : 'bg-secondary'}`} style={{ backgroundColor: '#0284c7' }}></span>
          <span className="tech-quick-label">กำลังทำ/เดินทาง:</span>
          <strong className="tech-quick-val" style={{ color: '#0369a1' }}>{inProgressCount} งาน</strong>
        </div>
        <div className="tech-quick-item">
          <span className={`tech-quick-dot ${pendingCount > 0 ? 'bg-warning' : 'bg-secondary'}`}></span>
          <span className="tech-quick-label">รอดำเนินการ:</span>
          <strong className="tech-quick-val text-warning-emphasis">{pendingCount} งาน</strong>
        </div>
        <div className="tech-quick-item">
          <span className="tech-quick-dot bg-success"></span>
          <span className="tech-quick-label">รายได้วันนี้:</span>
          <strong className="tech-quick-val text-success"><Money amount={earnings.data?.daily ?? 0} /></strong>
        </div>
        <div className="tech-quick-item">
          <span className="tech-quick-dot" style={{ backgroundColor: '#2563eb' }}></span>
          <span className="tech-quick-label">รายได้เดือนนี้:</span>
          <strong className="tech-quick-val" style={{ color: '#1d4ed8' }}><Money amount={earnings.data?.monthly ?? 0} /></strong>
        </div>
      </div>

      {/* แถบปุ่มสลับแท็บ (Tab Switcher) เพื่อลดการเลื่อนหน้าจอ */}
      <div className="tech-tabs-container">
        <div className="tech-tabs">
          <button
            type="button"
            className={`tech-tab-btn ${activeTab === 'jobs' ? 'active' : ''}`}
            onClick={() => setActiveTab('jobs')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
            <span>งานของฉัน</span>
            <span className="tech-tab-pill">{taskList.length}</span>
            {inProgressCount > 0 && <span className="tech-tab-pill active-job">{inProgressCount} กำลังทำ</span>}
          </button>

          <button
            type="button"
            className={`tech-tab-btn ${activeTab === 'earnings' ? 'active' : ''}`}
            onClick={() => setActiveTab('earnings')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <span>รายได้ & คอมมิชชัน</span>
            {earnings.data?.monthly > 0 && <span className="tech-tab-pill" style={{ color: '#15803d' }}>฿{earnings.data.monthly.toLocaleString()}</span>}
          </button>

          <button
            type="button"
            className={`tech-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>ส่งคำขอถึงผู้จัดการ</span>
          </button>

          <button
            type="button"
            className={`tech-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
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
      {activeTab === 'jobs' && renderJobsSection()}
      {activeTab === 'earnings' && renderEarningsSection()}
      {activeTab === 'requests' && renderRequestsSection()}
      {activeTab === 'all' && (
        <>
          {renderJobsSection()}
          {renderRequestsSection()}
          {renderEarningsSection()}
        </>
      )}
    </Dashboard>
  );
}
