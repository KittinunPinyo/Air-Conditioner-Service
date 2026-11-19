import { useState } from 'react';
import { Dashboard, Empty, MutationFeedback, Panel, ResourceState, StatusBadge } from './StaffDashboardCommon';
import { api, useMutation, useResource } from './StaffDashboardUtils';
import { PricingSettingsFields } from './PricingSettingsFields';
import './AdminTheme.css';

const sections = [
  { id: 'overview', label: 'ภาพรวม' },
  { id: 'users', label: 'ผู้ใช้งาน' },
  { id: 'pricing', label: 'ราคาและคอมมิชชัน' },
  { id: 'categories', label: 'หมวดหมู่บริการ' },
];

const roleLabels = {
  technician: 'ช่างเทคนิค',
  accountant: 'บัญชี',
  store_manager: 'ผู้จัดการ',
  system_admin: 'ผู้ดูแลระบบ',
  admin: 'ผู้ดูแลระบบ',
  customer: 'ลูกค้า',
};

export default function AdminDashboard() {
  const [refresh, setRefresh] = useState(0);
  const [activeSection, setActiveSection] = useState('overview');
  const users = useResource('/admin/users', refresh);
  const pricing = useResource('/admin/settings/pricing', refresh);
  const categories = useResource('/admin/categories', refresh);
  const mutation = useMutation();
  const [settingsDraft, setSettingsDraft] = useState({ source: null, value: null });
  const [categoryDrafts, setCategoryDrafts] = useState({});
  const settings = settingsDraft.source === pricing.data ? settingsDraft.value : pricing.data?.settings;
  const setSettings = (update) => setSettingsDraft((current) => ({
    source: pricing.data,
    value: typeof update === 'function' ? update(current.source === pricing.data ? current.value : pricing.data?.settings) : update,
  }));
  const createUser = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (await mutation.run(() => api('/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        fullName: form.get('fullName'), email: form.get('email'), phone: form.get('phone'),
        password: form.get('password'), role: form.get('role'),
      }),
    }), 'สร้างผู้ใช้แล้ว')) {
      formElement.reset();
      setRefresh((value) => value + 1);
    }
  };
  const updateUser = async (user, change) => {
    if (await mutation.run(() => api(`/admin/users/${encodeURIComponent(user.id)}`, {
      method: 'PATCH', body: JSON.stringify(change),
    }), 'อัปเดตผู้ใช้แล้ว')) setRefresh((value) => value + 1);
  };
  const savePricing = async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(Object.entries(settings || {}).map(([key, value]) => [
      key,
      typeof value === 'object' && value !== null
        ? Object.fromEntries(Object.entries(value).map(([nested, amount]) => [nested, Number(amount)]))
        : Number(value),
    ]));
    if (await mutation.run(() => api('/admin/settings/pricing', { method: 'PUT', body: JSON.stringify({ settings: payload }) }), 'บันทึกการตั้งราคาแล้ว')) setRefresh((value) => value + 1);
  };
  const createCategory = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (await mutation.run(() => api('/admin/categories', {
      method: 'POST',
      body: JSON.stringify({ name: form.get('name'), serviceType: form.get('serviceType') }),
    }), 'เพิ่มหมวดหมู่แล้ว')) {
      formElement.reset();
      setRefresh((value) => value + 1);
    }
  };
  const updateCategory = async (category, change) => {
    if (await mutation.run(() => api(`/admin/categories/${encodeURIComponent(category.id)}`, {
      method: 'PATCH', body: JSON.stringify(change),
    }), 'อัปเดตหมวดหมู่แล้ว')) {
      setCategoryDrafts((current) => {
        const next = { ...current };
        delete next[category.id];
        return next;
      });
      setRefresh((value) => value + 1);
    }
  };

  const userList = users.data?.users || [];
  const categoryList = categories.data?.categories || [];

  return <Dashboard title="ศูนย์จัดการระบบ" subtitle="จัดการผู้ใช้งาน ราคา และหมวดหมู่บริการ">
    <div className="admin-console">
    <MutationFeedback mutation={mutation} />
    <nav className="admin-section-nav mb-4" aria-label="เมนูผู้ดูแลระบบ">
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          className={`admin-section-button${activeSection === section.id ? ' active' : ''}`}
          aria-pressed={activeSection === section.id}
          onClick={() => setActiveSection(section.id)}
        >
          {section.label}
        </button>
      ))}
    </nav>

    {activeSection === 'overview' && (
      <>
        {users.error && <ResourceState {...users} onRetry={() => setRefresh((value) => value + 1)} />}
        {categories.error && <ResourceState {...categories} onRetry={() => setRefresh((value) => value + 1)} />}
        <div className="admin-overview-grid mb-4">
          <div className="admin-overview-card"><span>บัญชีผู้ใช้ทั้งหมด</span><strong>{users.loading || users.error ? '—' : userList.length}</strong><small>ผู้ใช้งานทุกบทบาท</small></div>
          <div className="admin-overview-card"><span>บัญชีที่เปิดใช้งาน</span><strong>{users.loading || users.error ? '—' : userList.filter((user) => user.isActive).length}</strong><small>จากบัญชีทั้งหมด</small></div>
          <div className="admin-overview-card"><span>หมวดหมู่บริการ</span><strong>{categories.loading || categories.error ? '—' : categoryList.filter((category) => category.isActive).length}</strong><small>หมวดหมู่ที่เปิดให้บริการ</small></div>
        </div>
        <Panel title="จัดการระบบ">
          <p className="text-secondary mb-3">เลือกหมวดด้านบนเพื่อจัดการข้อมูลแต่ละส่วน ระบบจะแสดงสถานะและแจ้งผลเมื่อบันทึกข้อมูล</p>
          <div className="admin-shortcuts">
            {sections.slice(1).map((section) => (
              <button key={section.id} type="button" className="admin-shortcut" onClick={() => setActiveSection(section.id)}>
                <span>{section.label}</span><span aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        </Panel>
      </>
    )}

    {activeSection === 'users' && <>
    <Panel title="สร้างผู้ใช้">
      <form className="row g-3 align-items-end" onSubmit={createUser}>
        <div className="col-12 col-md-6"><label className="form-label w-100 small fw-semibold">ชื่อ-นามสกุล<input className="form-control mt-1" name="fullName" placeholder="ระบุชื่อ-นามสกุล" required maxLength="120" /></label></div>
        <div className="col-12 col-md-6"><label className="form-label w-100 small fw-semibold">อีเมล<input className="form-control mt-1" name="email" type="email" placeholder="name@example.com" required /></label></div>
        <div className="col-12 col-md-6"><label className="form-label w-100 small fw-semibold">โทรศัพท์<input className="form-control mt-1" name="phone" type="tel" placeholder="ระบุเบอร์โทรศัพท์" required /></label></div>
        <div className="col-12 col-md-6">
          <label className="form-label w-100 small fw-semibold">รหัสผ่าน
          <input className="form-control" name="password" type="password" placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)" required minLength="6" maxLength="72"
            onInput={(event) => {
              const isOverLimit = new TextEncoder().encode(event.currentTarget.value).length > 72;
              event.currentTarget.setCustomValidity(isOverLimit ? 'รหัสผ่านต้องมีความยาวไม่เกิน 72 ไบต์' : '');
            }} />
          </label>
          <div className="form-text">อย่างน้อย 6 ตัวอักษร</div>
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label w-100 small fw-semibold">บทบาท
            <select className="form-select mt-1" name="role" defaultValue="technician"><option value="technician">ช่างเทคนิค</option><option value="accountant">บัญชี</option><option value="store_manager">ผู้จัดการ</option><option value="system_admin">ผู้ดูแลระบบ</option></select>
          </label>
        </div>
        <div className="col-12 col-md-6 d-grid"><button className="btn btn-primary admin-save-button" disabled={mutation.busy}>เพิ่มผู้ใช้</button></div>
      </form>
    </Panel>
    <Panel title="ผู้ใช้งานและสิทธิ์">
      <ResourceState {...users} onRetry={() => setRefresh((value) => value + 1)} />
      {users.data && (users.data.users?.length ? <div className="table-responsive"><table className="table align-middle"><thead><tr><th>ผู้ใช้</th><th>บทบาท</th><th>สถานะ</th><th>ปรับสิทธิ์ / สถานะ</th></tr></thead><tbody>
        {users.data.users.map((user) => <tr key={user.id}><td>{user.fullName}<br /><small>{user.email} · {user.phone}</small></td>
          <td>{roleLabels[user.role] || user.role}</td><td><StatusBadge status={user.isActive ? 'active' : 'inactive'} /></td>
          <td><div className="d-flex gap-2"><select className="form-select form-select-sm" aria-label={`บทบาท ${user.fullName}`} value={user.role === 'admin' ? 'system_admin' : user.role} onChange={(event) => updateUser(user, { role: event.target.value, isActive: user.isActive })}>
            <option value="technician">ช่าง</option><option value="accountant">บัญชี</option><option value="store_manager">ผู้จัดการ</option><option value="system_admin">แอดมิน</option><option value="customer">ลูกค้า</option></select>
            <button className={`btn btn-sm ${user.isActive ? 'btn-outline-danger' : 'btn-outline-success'}`} disabled={mutation.busy} onClick={() => updateUser(user, { role: user.role === 'admin' ? 'system_admin' : user.role, isActive: !user.isActive })}>{user.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}</button>
          </div></td>
        </tr>)}
      </tbody></table></div> : <Empty>ไม่มีผู้ใช้งาน</Empty>)}
    </Panel>
    </>}
    {activeSection === 'pricing' && <Panel title="ตั้งค่าราคาและคอมมิชชัน">
      <ResourceState {...pricing} onRetry={() => setRefresh((value) => value + 1)} />
      {settings && <form onSubmit={savePricing}>
        <p className="admin-pricing-description">กรอกราคาบริการเป็นบาท และกำหนดอัตราคอมมิชชันเป็นเปอร์เซ็นต์</p>
        <PricingSettingsFields settings={settings} setSettings={setSettings} />
        <div className="d-flex justify-content-end mt-4"><button className="btn btn-primary admin-save-button" disabled={mutation.busy}>บันทึกการตั้งค่า</button></div>
      </form>}
    </Panel>}
    {activeSection === 'categories' && <Panel title="หมวดหมู่บริการ">
      <form className="row g-2 mb-3" onSubmit={createCategory}>
        <div className="col-12 col-md-6"><input className="form-control" name="name" placeholder="ชื่อหมวดหมู่ใหม่" required minLength="2" maxLength="120" /></div>
        <div className="col-7 col-md-4"><select className="form-select" name="serviceType" defaultValue="repair"><option value="repair">ซ่อม / ล้างแอร์</option><option value="install">ติดตั้ง / ย้ายแอร์</option></select></div>
        <div className="col-5 col-md-2 d-grid"><button className="btn btn-primary text-nowrap" disabled={mutation.busy}>เพิ่มหมวดหมู่</button></div>
      </form>
      <ResourceState {...categories} onRetry={() => setRefresh((value) => value + 1)} />
      {categories.data && (categories.data.categories?.length ? <div className="table-responsive"><table className="table align-middle"><thead><tr><th>ชื่อ</th><th>ประเภทบริการ</th><th>สถานะ</th><th>แก้ไข</th></tr></thead><tbody>
        {categories.data.categories.map((category) => {
          const draft = categoryDrafts[category.id] || { name: category.name, serviceType: category.serviceType || 'repair' };
          return <tr key={category.id}>
            <td><input className="form-control form-control-sm" aria-label={`ชื่อหมวดหมู่ ${category.name}`} value={draft.name}
              onChange={(event) => setCategoryDrafts((current) => ({ ...current, [category.id]: { ...draft, name: event.target.value } }))} /></td>
            <td><select className="form-select form-select-sm" aria-label={`ประเภทบริการ ${category.name}`} value={draft.serviceType}
              onChange={(event) => setCategoryDrafts((current) => ({ ...current, [category.id]: { ...draft, serviceType: event.target.value } }))}>
              <option value="repair">ซ่อม / ล้างแอร์</option><option value="install">ติดตั้ง / ย้ายแอร์</option>
            </select></td>
            <td><StatusBadge status={category.isActive ? 'active' : 'inactive'} /></td>
            <td><div className="d-flex gap-2">
              <button className="btn btn-sm btn-primary" disabled={mutation.busy || !draft.name.trim()}
                onClick={() => updateCategory(category, { name: draft.name.trim(), serviceType: draft.serviceType, isActive: category.isActive })}>บันทึก</button>
              <button className="btn btn-sm btn-outline-secondary" disabled={mutation.busy}
                onClick={() => updateCategory(category, { name: draft.name.trim(), serviceType: draft.serviceType, isActive: !category.isActive })}>{category.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}</button>
            </div></td>
          </tr>;
        })}
      </tbody></table></div> : <Empty>ยังไม่มีหมวดหมู่</Empty>)}
    </Panel>}
    </div>
  </Dashboard>;
}
