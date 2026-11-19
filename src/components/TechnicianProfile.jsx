import { Link } from 'react-router-dom';
import { Dashboard, Empty, Money, Panel, ResourceState, StatusBadge } from './StaffDashboardCommon';
import { getServiceLabel, useResource } from './StaffDashboardUtils';
import { useCustomerData } from './customerContext';

export default function TechnicianProfile() {
  const { user } = useCustomerData();
  const tasks = useResource('/technician/tasks');
  const earnings = useResource('/technician/earnings');
  const taskList = tasks.data?.tasks || [];
  const completedTasks = taskList.filter((task) => task.status === 'completed');
  const initial = user?.fullName?.trim().charAt(0) || 'ช';

  return (
    <Dashboard title="โปรไฟล์ของฉัน" subtitle="ข้อมูลบัญชีและประวัติการปฏิบัติงาน">
      <div className="row g-4 align-items-start">
        <div className="col-12 col-lg-4">
          <Panel title="ข้อมูลช่าง">
            <div className="text-center">
              <div className="staff-user-avatar mx-auto mb-3" style={{ width: 76, height: 76, fontSize: '2rem' }}>
                {initial}
              </div>
              <h2 className="h5 fw-bold mb-1">{user?.fullName || '—'}</h2>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-2">
                ช่างเทคนิค
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
          <Panel title="สรุปการทำงาน">
            <ResourceState {...tasks} />
            <ResourceState {...earnings} />
            {!tasks.loading && !tasks.error && (
              <div className="row g-3">
                <div className="col-6 col-md-4">
                  <div className="staff-stat">
                    <small>งานที่ได้รับมอบหมาย</small>
                    <strong>{taskList.length}</strong>
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <div className="staff-stat">
                    <small>งานที่เสร็จสิ้น</small>
                    <strong>{completedTasks.length}</strong>
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className="staff-stat">
                    <small>รายได้คอมมิชชันเดือนนี้</small>
                    <strong><Money amount={earnings.data?.monthly} /></strong>
                  </div>
                </div>
              </div>
            )}
          </Panel>

          <Panel title="ประวัติงาน">
            <ResourceState {...tasks} />
            {!tasks.loading && !tasks.error && taskList.length === 0 && <Empty>ยังไม่มีงานที่ได้รับมอบหมาย</Empty>}
            {!tasks.loading && !tasks.error && taskList.length > 0 && (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr><th>บริการ</th><th>วันที่</th><th>ลูกค้า</th><th>สถานะ</th></tr>
                  </thead>
                  <tbody>
                    {taskList.map((task) => (
                      <tr key={task.id}>
                        <td>{getServiceLabel(task.serviceType, task.issue)}</td>
                        <td>{task.date || '—'}</td>
                        <td>{task.customer?.name || '—'}</td>
                        <td><StatusBadge status={task.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      </div>
      <div className="text-end">
        <Link to="/technician" className="btn btn-primary">กลับไปหน้างาน</Link>
      </div>
    </Dashboard>
  );
}
