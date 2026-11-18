import { useState } from 'react';
import { Dashboard, DateRange, Empty, Money, MutationFeedback, Panel, ResourceState, StatusBadge } from './StaffDashboardCommon';
import { api, monthStart, today, useMutation, useResource } from './StaffDashboardUtils';

export default function AccountantDashboard() {
  const [refresh, setRefresh] = useState(0);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const query = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const payments = useResource('/accounting/payments', refresh);
  const financials = useResource(`/accounting/financials${query}`, refresh);
  const payroll = useResource(`/accounting/payroll${query}`, refresh);
  const invoices = useResource('/accounting/invoices', refresh);
  const mutation = useMutation();
  const [notes, setNotes] = useState({});
  const [printInvoice, setPrintInvoice] = useState(null);
  const review = async (payment, decision) => {
    if (await mutation.run(() => api(`/accounting/payments/${encodeURIComponent(payment.id)}/review`, {
      method: 'PATCH', body: JSON.stringify({ decision, note: notes[payment.id] || '' }),
    }), 'บันทึกผลตรวจสอบแล้ว')) setRefresh((value) => value + 1);
  };

  return <Dashboard title="การเงินและบัญชี" subtitle="ตรวจสอบหลักฐานชำระเงิน ติดตามรายรับ ใบแจ้งหนี้ และเงินเดือนช่าง">
    <div className="d-flex justify-content-end mb-3"><DateRange {...{ from, to, setFrom, setTo }} /></div>
    <MutationFeedback mutation={mutation} />
    <Panel title="สรุปการเงิน">
      <ResourceState {...financials} />
      {financials.data && <>
        <div className="row g-3 mb-3">
          {[['รายรับ', <Money amount={financials.data.income} />], ['ชำระแล้ว', financials.data.paidCount], ['รอดำเนินการ', financials.data.pendingCount]].map(([label, value]) =>
            <div className="col-12 col-md-4" key={label}><div className="staff-stat"><small>{label}</small><strong>{value}</strong></div></div>)}
        </div>
        <div className="table-responsive"><table className="table"><thead><tr><th>วันที่</th><th>รายรับ</th></tr></thead><tbody>
          {(financials.data.daily || []).map((item) => <tr key={item.date}><td>{item.date}</td><td><Money amount={item.amount} /></td></tr>)}
        </tbody></table></div>
      </>}
    </Panel>
    <Panel title="ตรวจสอบการชำระเงิน">
      <ResourceState {...payments} onRetry={() => setRefresh((value) => value + 1)} />
      {payments.data && (payments.data.payments?.length ? <div className="table-responsive"><table className="table align-middle">
        <thead><tr><th>งาน / ลูกค้า</th><th>ยอด</th><th>สถานะ</th><th>หลักฐาน / การตรวจสอบ</th></tr></thead>
        <tbody>{payments.data.payments.map((payment) => <tr key={payment.id}>
          <td>{payment.jobId}<br /><small className="text-secondary">{payment.customerName} · {payment.createdAt}</small></td>
          <td><Money amount={payment.amount} /></td><td><StatusBadge status={payment.status} /></td>
          <td>{payment.proofUrl && <a href={payment.proofUrl} target="_blank" rel="noreferrer" className="d-block mb-2">เปิดหลักฐาน</a>}
            <div className="d-flex flex-wrap gap-2"><input className="form-control form-control-sm" style={{ maxWidth: 220 }} placeholder="หมายเหตุ" maxLength="500" value={notes[payment.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [payment.id]: event.target.value }))} />
              <button className="btn btn-sm btn-success" disabled={mutation.busy || payment.status !== 'pending'} onClick={() => review(payment, 'approve')}>อนุมัติ</button>
              <button className="btn btn-sm btn-outline-danger" disabled={mutation.busy || payment.status !== 'pending'} onClick={() => review(payment, 'reject')}>ปฏิเสธ</button></div>
          </td>
        </tr>)}</tbody></table></div> : <Empty>ไม่มีรายการชำระเงิน</Empty>)}
    </Panel>
    <Panel title="เงินเดือนและคอมมิชชันช่าง">
      <ResourceState {...payroll} />
      {payroll.data && (payroll.data.payroll?.length ? <div className="table-responsive"><table className="table align-middle"><thead><tr><th>ช่าง</th><th>จำนวนงาน</th><th>ค่าตอบแทน</th><th>คอมมิชชัน</th></tr></thead><tbody>
        {payroll.data.payroll.map((item) => <tr key={item.technicianId}><td>{item.name}</td><td>{item.jobCount}</td><td><Money amount={item.amount} /></td><td><Money amount={item.commission} /></td></tr>)}
      </tbody></table></div> : <Empty>ไม่มีข้อมูลเงินเดือนในช่วงวันที่เลือก</Empty>)}
    </Panel>
    <Panel title="ใบแจ้งหนี้">
      <ResourceState {...invoices} onRetry={() => setRefresh((value) => value + 1)} />
      {invoices.data && (invoices.data.invoices?.length ? <div className="table-responsive"><table className="table align-middle"><thead><tr><th>เลขที่</th><th>งาน / ลูกค้า</th><th>ยอด</th><th>สถานะ</th><th>วันที่</th><th>เอกสาร</th></tr></thead><tbody>
        {invoices.data.invoices.map((item) => <tr key={item.id}><td>{item.invoiceNumber}</td><td>{item.jobId}<br /><small>{item.customerName}</small></td><td><Money amount={item.amount} /></td><td><StatusBadge status={item.status} /></td><td>{item.createdAt}</td><td><button className="btn btn-sm btn-outline-primary" onClick={() => setPrintInvoice(item)}>ดู / พิมพ์</button></td></tr>)}
      </tbody></table></div> : <Empty>ไม่มีใบแจ้งหนี้</Empty>)}
    </Panel>
    {printInvoice && <section className="print-invoice card border p-4 p-md-5" aria-label="ตัวอย่างใบแจ้งหนี้">
      <div className="d-flex justify-content-between align-items-start mb-5">
        <div><h2 className="h3 fw-bold">AeroService</h2><p className="mb-0 text-secondary">ใบแจ้งหนี้</p></div>
        <div className="text-end"><strong>{printInvoice.invoiceNumber}</strong><div>{printInvoice.createdAt}</div></div>
      </div>
      <div className="row mb-4"><div className="col-6"><small className="text-secondary">ลูกค้า</small><div className="fw-semibold">{printInvoice.customerName}</div></div>
        <div className="col-6 text-end"><small className="text-secondary">หมายเลขงาน</small><div className="fw-semibold">{printInvoice.jobId}</div></div></div>
      <table className="table"><thead><tr><th>รายละเอียด</th><th className="text-end">ยอดรวม</th></tr></thead>
        <tbody><tr><td>บริการเครื่องปรับอากาศ (งาน {printInvoice.jobId})</td><td className="text-end"><Money amount={printInvoice.amount} /></td></tr></tbody>
        <tfoot><tr><th>ยอดสุทธิ</th><th className="text-end"><Money amount={printInvoice.amount} /></th></tr></tfoot>
      </table>
      <div className="mt-4"><StatusBadge status={printInvoice.status} /></div>
      <div className="d-flex gap-2 mt-4 no-print"><button className="btn btn-primary" onClick={() => window.print()}>พิมพ์ใบแจ้งหนี้</button>
        <button className="btn btn-outline-secondary" onClick={() => setPrintInvoice(null)}>ปิด</button></div>
    </section>}
  </Dashboard>;
}
