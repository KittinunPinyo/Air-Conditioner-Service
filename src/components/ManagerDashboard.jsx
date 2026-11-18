import { useState } from 'react';
import { Dashboard, Empty, Money, MutationFeedback, Panel, ResourceState, StatusBadge } from './StaffDashboardCommon';
import { api, useMutation, useResource } from './StaffDashboardUtils';

export default function ManagerDashboard() {
  const [refresh, setRefresh] = useState(0);
  const operations = useResource('/manager/operations', refresh);
  const technicians = useResource('/manager/technicians', refresh);
  const requests = useResource('/manager/requests', refresh);
  const kpi = useResource('/manager/kpi', refresh);
  const mutation = useMutation();
  const [assignments, setAssignments] = useState({});
  const [notes, setNotes] = useState({});
  const assign = async (job, technicianId) => {
    if (!technicianId) return;
    if (await mutation.run(() => api(`/manager/bookings/${encodeURIComponent(job.id)}/assign`, {
      method: 'POST', body: JSON.stringify({ technicianId }),
    }), 'มอบหมายช่างแล้ว')) setRefresh((value) => value + 1);
  };
  const decide = async (request, decision) => {
    if (await mutation.run(() => api(`/manager/requests/${encodeURIComponent(request.id)}`, {
      method: 'PATCH', body: JSON.stringify({ decision, note: notes[request.id] || '' }),
    }), 'บันทึกผลการพิจารณาแล้ว')) setRefresh((value) => value + 1);
  };

  return <Dashboard title="จัดการปฏิบัติการ" subtitle="กระจายงานช่าง ดูแลคำขออนุมัติ และติดตามคุณภาพบริการ">
    <MutationFeedback mutation={mutation} />
    <Panel title="ตัวชี้วัดและคะแนนรีวิว">
      <ResourceState {...kpi} onRetry={() => setRefresh((value) => value + 1)} />
      {kpi.data && <>
        <div className="row g-3 mb-3">
          {[['งานสำเร็จ', kpi.data.completedCount], ['คะแนนเฉลี่ย', kpi.data.averageRating ?? '—'], ['จำนวนรีวิว', kpi.data.reviewCount]].map(([label, value]) =>
            <div className="col-6 col-lg-4" key={label}><div className="staff-stat"><small>{label}</small><strong>{value}</strong></div></div>)}
        </div>
        <div className="table-responsive"><table className="table"><thead><tr><th>ช่าง</th><th>งานสำเร็จ</th><th>คะแนนเฉลี่ย</th></tr></thead><tbody>
          {(kpi.data.technicians || []).map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.completedCount}</td><td>{item.averageRating ?? '—'}</td></tr>)}
        </tbody></table></div>
        <h3 className="h6 fw-bold mt-4">ความคิดเห็นจากลูกค้าล่าสุด</h3>
        {kpi.data.reviews?.length ? <div className="row g-3">
          {kpi.data.reviews.map((review, index) => <div className="col-12 col-md-6" key={`${review.jobId}-${review.createdAt || index}`}>
            <article className="border rounded-3 p-3 h-100">
              <div className="d-flex justify-content-between gap-2">
                <strong className="small">{review.customerName || 'ลูกค้า'} · {review.jobId}</strong>
                <span className="text-warning text-nowrap" aria-label={`${review.rating} จาก 5 ดาว`}>{'★'.repeat(Math.max(0, Math.min(5, Number(review.rating) || 0)))}{'☆'.repeat(5 - Math.max(0, Math.min(5, Number(review.rating) || 0)))}</span>
              </div>
              <p className="small my-2">{review.comment || 'ไม่มีข้อความเพิ่มเติม'}</p>
              <div className="d-flex justify-content-between gap-2 text-secondary" style={{ fontSize: '.78rem' }}>
                <span>ช่าง: {review.technicianName || '—'}</span><span>{review.createdAt || ''}</span>
              </div>
            </article>
          </div>)}
        </div> : <Empty>ยังไม่มีรีวิวจากลูกค้า</Empty>}
      </>}
    </Panel>
    <Panel title="ตารางงานและการจัดช่าง">
      <ResourceState {...operations} onRetry={() => setRefresh((value) => value + 1)} />
      <ResourceState {...technicians} onRetry={() => setRefresh((value) => value + 1)} />
      {operations.data && (operations.data.bookings?.length ? <div className="table-responsive"><table className="table align-middle"><thead><tr><th>งาน / กำหนดการ</th><th>ลูกค้า / ที่อยู่</th><th>สถานะ / ราคา</th><th>ช่างผู้รับผิดชอบ</th></tr></thead><tbody>
        {operations.data.bookings.map((job) => <tr key={job.id}><td>{job.serviceType}<br /><small className="text-secondary">{job.date} · {job.timeSlot}</small></td>
          <td>{job.customerName}<br /><small>{job.address}</small></td><td><StatusBadge status={job.status} /><div className="small mt-1"><Money amount={job.finalPrice ?? job.estimatedPrice} /></div></td>
          <td><select className="form-select form-select-sm" aria-label={`มอบหมายช่างสำหรับงาน ${job.id}`} value={assignments[job.id] ?? job.technicianId ?? ''} disabled={technicians.loading || mutation.busy || ['repairing', 'completed', 'cancelled'].includes(job.status)} onChange={(event) => { setAssignments((current) => ({ ...current, [job.id]: event.target.value })); assign(job, event.target.value); }}>
            <option value="">เลือกช่าง</option>{(technicians.data?.technicians || []).map((tech) => <option key={tech.id} value={tech.id}>{tech.fullName}</option>)}
          </select>{job.technicianName && <small className="text-secondary">ปัจจุบัน: {job.technicianName}</small>}</td>
        </tr>)}
      </tbody></table></div> : <Empty>ไม่มีงานที่ต้องจัดการ</Empty>)}
    </Panel>
    <Panel title="คิวคำขออนุมัติ">
      <ResourceState {...requests} onRetry={() => setRefresh((value) => value + 1)} />
      {requests.data && (requests.data.requests?.length ? <div className="table-responsive"><table className="table align-middle"><thead><tr><th>ประเภท / งาน</th><th>รายละเอียด</th><th>ผู้ขอ / ยอด</th><th>สถานะ / การดำเนินการ</th></tr></thead><tbody>
        {requests.data.requests.map((request) => <tr key={request.id}><td>{request.type}<br /><small>{request.jobId} · {request.createdAt}</small></td>
          <td>{request.description}</td><td>{request.requesterName}<br /><Money amount={request.amount} /></td><td><StatusBadge status={request.status} />
            <div className="d-flex flex-wrap gap-1 mt-2"><input className="form-control form-control-sm" placeholder="หมายเหตุ" maxLength="500" value={notes[request.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))} />
              <button className="btn btn-sm btn-success" disabled={mutation.busy || /approved|reject/i.test(request.status || '')} onClick={() => decide(request, 'approve')}>อนุมัติ</button>
              <button className="btn btn-sm btn-outline-danger" disabled={mutation.busy || /approved|reject/i.test(request.status || '')} onClick={() => decide(request, 'reject')}>ปฏิเสธ</button></div>
          </td></tr>)}
      </tbody></table></div> : <Empty>ไม่มีคำขอรอพิจารณา</Empty>)}
    </Panel>
  </Dashboard>;
}
