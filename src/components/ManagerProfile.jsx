import { Link } from 'react-router-dom';
import { Dashboard, Empty, Panel, ResourceState } from './StaffDashboardCommon';
import { useResource } from './StaffDashboardUtils';
import { useCustomerData } from './customerContext';

export default function ManagerProfile() {
  const { user } = useCustomerData();
  const operations = useResource('/manager/operations');
  const technicians = useResource('/manager/technicians');
  const requests = useResource('/manager/requests');
  const bookings = operations.data?.bookings || [];
  const activeBookings = bookings.filter((booking) => !['completed', 'cancelled'].includes(booking.status));
  const unassignedBookings = activeBookings.filter((booking) => !booking.technicianId);
  const pendingRequests = (requests.data?.requests || []).filter((request) => request.status === 'pending');
  const initial = user?.fullName?.trim().charAt(0) || 'ผ';

  return (
    <Dashboard title="โปรไฟล์ผู้จัดการ" subtitle="ข้อมูลบัญชีและภาพรวมงานที่รับผิดชอบ">
      <div className="row g-4 align-items-start">
        <div className="col-12 col-lg-4">
          <Panel title="ข้อมูลบัญชี">
            <div className="text-center">
              <div className="staff-user-avatar mx-auto mb-3" style={{ width: 76, height: 76, fontSize: '2rem' }}>
                {initial}
              </div>
              <h2 className="h5 fw-bold mb-1">{user?.fullName || '—'}</h2>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-2">
                ผู้จัดการ
              </span>
            </div>
            <div className="border-top mt-4 pt-3">
              <dl className="row mb-0 small">
                <dt className="col-4 text-secondary">อีเมล</dt>
                <dd className="col-8 text-break">{user?.email || '—'}</dd>
                <dt className="col-4 text-secondary">โทรศัพท์</dt>
                <dd className="col-8">{user?.phone || '—'}</dd>
                <dt className="col-4 text-secondary">สถานะบัญชี</dt>
                <dd className="col-8 mb-0">{user?.isActive === false ? 'ระงับใช้งาน' : 'ปกติ'}</dd>
              </dl>
            </div>
          </Panel>
        </div>

        <div className="col-12 col-lg-8">
          <Panel title="ภาพรวมงานที่ดูแล">
            <ResourceState {...operations} />
            <ResourceState {...technicians} />
            <ResourceState {...requests} />
            {!operations.loading && !operations.error && (
              <div className="row g-3">
                <div className="col-6 col-md-3">
                  <div className="staff-stat">
                    <small>งานที่ยังดำเนินการ</small>
                    <strong>{activeBookings.length}</strong>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="staff-stat">
                    <small>งานรอมอบหมายช่าง</small>
                    <strong>{unassignedBookings.length}</strong>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="staff-stat">
                    <small>ช่างในทีม</small>
                    <strong>{technicians.data?.technicians?.length ?? '—'}</strong>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="staff-stat">
                    <small>คำขอรอพิจารณา</small>
                    <strong>{requests.data ? pendingRequests.length : '—'}</strong>
                  </div>
                </div>
              </div>
            )}
            {bookings.length === 0 && !operations.loading && !operations.error && <Empty>ยังไม่มีรายการงาน</Empty>}
          </Panel>
        </div>
      </div>
      <div className="text-end">
        <Link to="/manager" className="btn btn-primary">กลับไปหน้าจัดการ</Link>
      </div>
    </Dashboard>
  );
}
