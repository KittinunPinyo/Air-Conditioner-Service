import { Link } from 'react-router-dom';
import { Dashboard, Money, Panel, ResourceState } from './StaffDashboardCommon';
import { monthStart, today, useResource } from './StaffDashboardUtils';
import { useCustomerData } from './customerContext';
import './AccountantTheme.css';

export default function AccountantProfile() {
  const { user } = useCustomerData();
  const payments = useResource('/accounting/payments');
  const invoices = useResource('/accounting/invoices');
  const financials = useResource(`/accounting/financials?from=${monthStart()}&to=${today()}`);
  const pendingPayments = (payments.data?.payments || []).filter((payment) => payment.status === 'pending');
  const displayName = user?.fullName || user?.name || 'เจ้าหน้าที่บัญชี';
  const initial = displayName.trim().charAt(0) || 'บ';

  return (
    <Dashboard title="โปรไฟล์บัญชี" subtitle="ข้อมูลบัญชีผู้ใช้และภาพรวมงานด้านการเงิน">
      <div className="accountant-workspace">
        <div className="row g-4 align-items-start">
          <div className="col-12 col-lg-4">
            <Panel title="ข้อมูลบัญชี">
              <div className="accountant-profile-identity">
                <div className="accountant-profile-avatar" aria-hidden="true">{initial}</div>
                <h2>{displayName}</h2>
                <span>เจ้าหน้าที่บัญชี</span>
              </div>
              <dl className="accountant-profile-details mb-0">
                <div><dt>อีเมล</dt><dd className="text-break">{user?.email || '—'}</dd></div>
                <div><dt>โทรศัพท์</dt><dd>{user?.phone || '—'}</dd></div>
                <div><dt>สถานะบัญชี</dt><dd>{user?.isActive === false ? 'ระงับใช้งาน' : 'ปกติ'}</dd></div>
              </dl>
            </Panel>
            <Link to="/accountant" className="btn btn-primary accountant-profile-back">กลับไปหน้าการเงิน</Link>
          </div>

          <div className="col-12 col-lg-8">
            <Panel title="ภาพรวมการเงินเดือนนี้">
              <ResourceState {...financials} />
              <ResourceState {...payments} />
              <ResourceState {...invoices} />
              <div className="accountant-summary-grid">
                <div className="accountant-summary-card">
                  <small>รายรับเดือนนี้</small>
                  <strong>{financials.loading || financials.error ? '—' : <Money amount={financials.data?.income} />}</strong>
                </div>
                <div className="accountant-summary-card">
                  <small>รายการรอตรวจสอบ</small>
                  <strong>{payments.loading || payments.error ? '—' : pendingPayments.length}</strong>
                </div>
                <div className="accountant-summary-card">
                  <small>ใบแจ้งหนี้</small>
                  <strong>{invoices.loading || invoices.error ? '—' : invoices.data?.invoices?.length ?? 0}</strong>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </Dashboard>
  );
}
