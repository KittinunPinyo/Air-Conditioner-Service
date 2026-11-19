import { Link } from 'react-router-dom';
import { Dashboard, Panel, ResourceState } from './StaffDashboardCommon';
import { useResource } from './StaffDashboardUtils';
import { useCustomerData } from './customerContext';
import './AdminTheme.css';

export default function AdminProfile() {
  const { user } = useCustomerData();
  const users = useResource('/admin/users');
  const categories = useResource('/admin/categories');
  const userList = users.data?.users || [];
  const activeUsers = userList.filter((item) => item.isActive);
  const activeCategories = (categories.data?.categories || []).filter((item) => item.isActive);
  const displayName = user?.fullName || user?.name || 'ผู้ดูแลระบบ';
  const initial = displayName.trim().charAt(0) || 'ผ';

  return (
    <Dashboard title="โปรไฟล์ผู้ดูแลระบบ" subtitle="ข้อมูลบัญชีและภาพรวมการดูแลระบบ">
      <div className="row g-4 align-items-start">
        <div className="col-12 col-lg-4">
          <Panel title="ข้อมูลบัญชี">
            <div className="admin-profile-card text-center">
              <div className="admin-profile-avatar mx-auto mb-3" aria-hidden="true">{initial}</div>
              <h2 className="h5 fw-bold mb-1">{displayName}</h2>
              <span className="admin-role-pill">ผู้ดูแลระบบ</span>
            </div>
            <dl className="admin-profile-details mb-0">
              <div><dt>อีเมล</dt><dd className="text-break">{user?.email || '—'}</dd></div>
              <div><dt>โทรศัพท์</dt><dd>{user?.phone || '—'}</dd></div>
              <div><dt>สถานะบัญชี</dt><dd>{user?.isActive === false ? 'ระงับใช้งาน' : 'ปกติ'}</dd></div>
            </dl>
          </Panel>
          <Link to="/admin" className="btn btn-primary w-100 admin-back-link">กลับไปหน้าจัดการ</Link>
        </div>

        <div className="col-12 col-lg-8">
          <Panel title="ภาพรวมการดูแลระบบ">
            <ResourceState {...users} />
            <ResourceState {...categories} />
            <div className="row g-3">
              <div className="col-6 col-md-4">
                <div className="admin-profile-stat"><small>บัญชีผู้ใช้</small><strong>{users.loading || users.error ? '—' : userList.length}</strong></div>
              </div>
              <div className="col-6 col-md-4">
                <div className="admin-profile-stat"><small>บัญชีที่ใช้งาน</small><strong>{users.loading || users.error ? '—' : activeUsers.length}</strong></div>
              </div>
              <div className="col-12 col-md-4">
                <div className="admin-profile-stat"><small>หมวดบริการที่เปิดอยู่</small><strong>{categories.loading || categories.error ? '—' : activeCategories.length}</strong></div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </Dashboard>
  );
}
