import { useState } from 'react';
import { Dashboard, Empty, Money, MutationFeedback, Panel, ResourceState, StatusBadge } from './StaffDashboardCommon';
import { api, useMutation, useResource } from './StaffDashboardUtils';

export default function TechnicianDashboard() {
  const [refresh, setRefresh] = useState(0);
  const tasks = useResource('/technician/tasks', refresh);
  const earnings = useResource('/technician/earnings', refresh);
  const taskList = tasks.data?.tasks || [];
  const mutation = useMutation();
  const [evidenceType, setEvidenceType] = useState({});
  const [finalPrices, setFinalPrices] = useState({});
  const [completionRanges, setCompletionRanges] = useState({});

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

  return <Dashboard title="งานของฉัน" subtitle="ตารางงานภาคสนาม สถานะบริการ และรายได้ค่าคอมมิชชัน">
    <ResourceState {...tasks} onRetry={() => setRefresh((value) => value + 1)} />
    <ResourceState {...earnings} onRetry={() => setRefresh((value) => value + 1)} />
    <MutationFeedback mutation={mutation} />
    {!tasks.loading && !tasks.error && taskList.length === 0 && <Panel title="งานวันนี้"><Empty>ยังไม่มีงานที่ได้รับมอบหมาย</Empty></Panel>}
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
      return <Panel key={job.id} title={`${job.serviceType || 'บริการ'} · ${job.date || ''} ${job.timeSlot || ''}`}
        action={<StatusBadge status={job.status} />}>
        <div className="row g-3">
          <div className="col-md-7">
            <p className="mb-1"><strong>ลูกค้า:</strong> {job.customer?.name || '—'} · {job.customer?.phone || '—'}</p>
            <p className="mb-1"><strong>ที่อยู่:</strong> {job.address || '—'}</p>
            {job.address && <a className="btn btn-sm btn-outline-primary my-2" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`} target="_blank" rel="noreferrer">เปิดเส้นทาง Google Maps</a>}
            <p className="mb-1"><strong>เครื่อง:</strong> {job.acType || '—'} · {job.btu || '—'} BTU</p>
            {job.issue && <p className="mb-1"><strong>อาการ:</strong> {job.issue}</p>}
            {job.installWork && <p className="mb-1"><strong>รายละเอียดติดตั้ง:</strong> {job.installWork}</p>}
            <p className="mb-1"><strong>ราคาประเมิน:</strong> <Money amount={estimate.min} />{estimate.max !== estimate.min && <> – <Money amount={estimate.max} /></>}</p>
            {job.status === 'repairing' && <>
              <p className="mb-1 small text-primary"><strong>ช่วงราคารวมที่อนุมัติแล้ว:</strong> <Money amount={range.min} /> – <Money amount={range.max} /></p>
              {taskPriceRange
                ? <p className="small text-secondary mb-1">รวมรายการเพิ่มเติมและส่วนลดที่ผู้จัดการอนุมัติแล้ว</p>
                : approvedAddons > 0 && <p className="small text-secondary mb-1">รวมรายการเพิ่มเติมที่อนุมัติแล้ว <Money amount={approvedAddons} /></p>}
              <form className="d-flex flex-wrap gap-2 align-items-end mt-2" onSubmit={(event) => completeJob(event, job, range)}>
                <label className="small">ราคาสุดท้าย<input className="form-control form-control-sm" type="number" min={range.min} max={range.max} step="1" required
                  value={finalPrices[job.id] ?? range.min}
                  onChange={(event) => setFinalPrices((current) => ({ ...current, [job.id]: event.target.value }))} /></label>
                <button className="btn btn-sm btn-success" disabled={mutation.busy || !canComplete}>ปิดงาน</button>
              </form>
              {!canComplete && <p className="small text-warning mt-2 mb-0">ต้องมีรูปก่อนและหลังปฏิบัติงานครบก่อนปิดงาน</p>}
            </>}
            <div className="d-flex flex-wrap gap-2 mt-3">
              {job.status === 'pending' && <button className="btn btn-sm btn-primary" disabled={mutation.busy} onClick={() => updateStatus(job, 'traveling')}>เริ่มเดินทาง</button>}
              {job.status === 'traveling' && <button className="btn btn-sm btn-primary" disabled={mutation.busy} onClick={() => updateStatus(job, 'repairing')}>เริ่มทำงาน</button>}
            </div>
          </div>
          <div className="col-md-5">
            <h3 className="h6 fw-bold">รายการเพิ่มเติม</h3>
            {job.addons?.length ? <ul className="list-group list-group-flush mb-3">{job.addons.map((item, index) =>
              <li className="list-group-item px-0 d-flex justify-content-between" key={`${item.description}-${index}`}><span>{item.description} <small className="text-secondary">({item.status})</small></span><Money amount={item.amount} /></li>)}</ul> : <p className="small text-secondary">ยังไม่มีรายการ</p>}
            <form className="row g-2 mb-3" onSubmit={(event) => addAddon(event, job.id)}>
              <div className="col-7"><input className="form-control form-control-sm" name="description" placeholder="รายละเอียด" required /></div>
              <div className="col-5"><input className="form-control form-control-sm" name="amount" type="number" min="0" step="0.01" placeholder="จำนวนเงิน" required /></div>
              <div className="col-12"><button className="btn btn-sm btn-outline-primary" disabled={mutation.busy}>ส่งรายการเพิ่มเติม</button></div>
            </form>
            <h3 className="h6 fw-bold">หลักฐานภาพถ่าย</h3>
            <div className="d-flex flex-wrap gap-2 mb-2">{(job.evidence || []).map((item) =>
              <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="badge text-bg-light border text-decoration-none">{item.type} · เปิดไฟล์</a>)}</div>
            <form onSubmit={(event) => uploadEvidence(event, job.id)} className="d-flex flex-wrap gap-2 align-items-center">
              <select className="form-select form-select-sm w-auto" name="type" value={evidenceType[job.id] || 'before'} onChange={(event) => setEvidenceType((current) => ({ ...current, [job.id]: event.target.value }))}>
                <option value="before">ก่อนทำงาน</option><option value="after">หลังทำงาน</option>
              </select>
              <input className="form-control form-control-sm flex-grow-1" type="file" name="file" accept="image/*" required />
              <button className="btn btn-sm btn-outline-secondary" disabled={mutation.busy}>อัปโหลด</button>
            </form>
          </div>
        </div>
      </Panel>;
    })}
    <Panel title="ส่งคำขอให้ผู้จัดการ">
      <form className="row g-2 align-items-end" onSubmit={submitRequest}>
        <div className="col-6 col-md-2"><label className="form-label small">ประเภทคำขอ<select className="form-select" name="type" defaultValue="discount"><option value="discount">ขอส่วนลด</option><option value="purchase">ขออนุมัติจัดซื้อ</option></select></label></div>
        <div className="col-6 col-md-3"><label className="form-label small">งานที่เกี่ยวข้อง (ถ้ามี)<select className="form-select" name="jobId" defaultValue=""><option value="">ไม่ระบุงาน</option>{taskList.map((job) => <option key={job.id} value={job.id}>{job.id} · {job.serviceType}</option>)}</select></label></div>
        <div className="col-12 col-md-4"><label className="form-label small">รายละเอียด<input className="form-control" name="description" required maxLength="500" /></label></div>
        <div className="col-6 col-md-2"><label className="form-label small">จำนวนเงิน<input className="form-control" name="amount" type="number" min="0" step="1" required /></label></div>
        <div className="col-6 col-md-1 d-grid"><button className="btn btn-primary" disabled={mutation.busy}>ส่งคำขอ</button></div>
      </form>
    </Panel>
    <Panel title="รายได้และคอมมิชชัน">
      <ResourceState {...earnings} />
      {earnings.data && <>
        <div className="row g-3 mb-3">
          <div className="col-6 col-lg-3"><div className="staff-stat"><small>วันนี้</small><strong><Money amount={earnings.data.daily} /></strong></div></div>
          <div className="col-6 col-lg-3"><div className="staff-stat"><small>เดือนนี้</small><strong><Money amount={earnings.data.monthly} /></strong></div></div>
          <div className="col-6 col-lg-3"><div className="staff-stat"><small>อัตราคอมมิชชัน</small><strong>{earnings.data.commissionRate ?? '—'}%</strong></div></div>
        </div>
        <div className="table-responsive"><table className="table align-middle"><thead><tr><th>งาน</th><th>วันที่จ่าย</th><th>ยอดงาน</th><th>คอมมิชชัน</th></tr></thead><tbody>
          {(earnings.data.items || []).map((item) => <tr key={`${item.jobId}-${item.paidAt}`}><td>{item.jobId}</td><td>{item.paidAt || '—'}</td><td><Money amount={item.amount} /></td><td><Money amount={item.commission} /></td></tr>)}
        </tbody></table></div>
        {!earnings.data.items?.length && <Empty>ยังไม่มีรายการรายได้</Empty>}
      </>}
    </Panel>
  </Dashboard>;
}
