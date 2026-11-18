import { useState } from 'react';
import { Dashboard, Empty, MutationFeedback, Panel, ResourceState, StatusBadge } from './StaffDashboardCommon';
import { api, useMutation, useResource } from './StaffDashboardUtils';

const settingLabels = {
  repairBaseSmall: 'ค่าซ่อมพื้นฐาน (เครื่องเล็ก)', repairBaseLarge: 'ค่าซ่อมพื้นฐาน (เครื่องใหญ่)',
  ceilingFee: 'ค่าบริการเพดาน', issueSurcharge: 'ค่าบริการเพิ่มตามอาการ',
  installWall: 'ค่าติดตั้งแบบติดผนัง', installCeiling: 'ค่าติดตั้งแบบแขวน/ฝังฝ้า',
  largeBtuSurcharge: 'ค่าบริการเพิ่ม BTU ขนาดใหญ่', moveMin: 'ย้ายเครื่อง (ต่ำสุด)',
  moveMax: 'ย้ายเครื่อง (สูงสุด)', commissionRate: 'อัตราคอมมิชชัน (%)',
};

function PricingFields({ settings, setSettings }) {
  return <div className="row g-3">
    {Object.entries(settings || {}).map(([key, value]) => key === 'issueSurcharge'
      ? <div className="col-12" key={key}><h3 className="h6 fw-bold">{settingLabels[key]}</h3><div className="row g-2">
        {Object.entries(value || {}).map(([issue, amount]) => <div className="col-6 col-md-3" key={issue}>
          <label className="form-label small">{issue}<input className="form-control" type="number" min="0" step="1" value={amount ?? ''} onChange={(event) => setSettings((current) => ({ ...current, issueSurcharge: { ...current.issueSurcharge, [issue]: event.target.value } }))} /></label>
        </div>)}</div></div>
      : <div className="col-6 col-md-4" key={key}><label className="form-label small">{settingLabels[key] || key}<input className="form-control" type="number" min="0" max={key === 'commissionRate' ? '100' : undefined} step={key === 'commissionRate' ? '0.01' : '1'} value={value ?? ''} onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.value }))} /></label></div>)}
  </div>;
}

export default function AdminDashboard() {
  const [refresh, setRefresh] = useState(0);
  const users = useResource('/admin/users', refresh);
  const pricing = useResource('/admin/settings/pricing', refresh);
  const categories = useResource('/admin/categories', refresh);
  const audit = useResource('/admin/audit', refresh);
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

  return <Dashboard title="ผู้ดูแลระบบ" subtitle="บริหารผู้ใช้งาน การตั้งราคา หมวดหมู่บริการ และบันทึกกิจกรรม">
    <MutationFeedback mutation={mutation} />
    <Panel title="สร้างผู้ใช้">
      <form className="row g-2" onSubmit={createUser}>
        <div className="col-12 col-md-3"><input className="form-control" name="fullName" placeholder="ชื่อ-นามสกุล" required maxLength="120" /></div>
        <div className="col-12 col-md-3"><input className="form-control" name="email" type="email" placeholder="อีเมล" required /></div>
        <div className="col-6 col-md-2"><input className="form-control" name="phone" type="tel" placeholder="โทรศัพท์" required /></div>
        <div className="col-6 col-md-2">
          <input className="form-control" name="password" type="password" placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)" required minLength="6" maxLength="72"
            onInput={(event) => {
              const isOverLimit = new TextEncoder().encode(event.currentTarget.value).length > 72;
              event.currentTarget.setCustomValidity(isOverLimit ? 'รหัสผ่านต้องมีความยาวไม่เกิน 72 ไบต์' : '');
            }} />
          <div className="form-text">อย่างน้อย 6 ตัวอักษร</div>
        </div>
        <div className="col-8 col-md-1"><select className="form-select" name="role" defaultValue="technician"><option value="technician">ช่าง</option><option value="accountant">บัญชี</option><option value="store_manager">ผู้จัดการ</option><option value="system_admin">แอดมิน</option></select></div>
        <div className="col-4 col-md-1 d-grid"><button className="btn btn-primary" disabled={mutation.busy}>เพิ่ม</button></div>
      </form>
    </Panel>
    <Panel title="ผู้ใช้งานและสิทธิ์">
      <ResourceState {...users} onRetry={() => setRefresh((value) => value + 1)} />
      {users.data && (users.data.users?.length ? <div className="table-responsive"><table className="table align-middle"><thead><tr><th>ผู้ใช้</th><th>บทบาท</th><th>สถานะ</th><th>ปรับสิทธิ์ / สถานะ</th></tr></thead><tbody>
        {users.data.users.map((user) => <tr key={user.id}><td>{user.fullName}<br /><small>{user.email} · {user.phone}</small></td>
          <td>{user.role}</td><td><StatusBadge status={user.isActive ? 'active' : 'inactive'} /></td>
          <td><div className="d-flex gap-2"><select className="form-select form-select-sm" aria-label={`บทบาท ${user.fullName}`} value={user.role === 'admin' ? 'system_admin' : user.role} onChange={(event) => updateUser(user, { role: event.target.value, isActive: user.isActive })}>
            <option value="technician">ช่าง</option><option value="accountant">บัญชี</option><option value="store_manager">ผู้จัดการ</option><option value="system_admin">แอดมิน</option><option value="customer">ลูกค้า</option></select>
            <button className={`btn btn-sm ${user.isActive ? 'btn-outline-danger' : 'btn-outline-success'}`} disabled={mutation.busy} onClick={() => updateUser(user, { role: user.role === 'admin' ? 'system_admin' : user.role, isActive: !user.isActive })}>{user.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}</button>
          </div></td>
        </tr>)}
      </tbody></table></div> : <Empty>ไม่มีผู้ใช้งาน</Empty>)}
    </Panel>
    <Panel title="ตั้งค่าราคาและคอมมิชชัน">
      <ResourceState {...pricing} onRetry={() => setRefresh((value) => value + 1)} />
      {settings && <form onSubmit={savePricing}><PricingFields settings={settings} setSettings={setSettings} /><button className="btn btn-primary mt-3" disabled={mutation.busy}>บันทึกการตั้งค่า</button></form>}
    </Panel>
    <Panel title="หมวดหมู่บริการ">
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
    </Panel>
    <Panel title="บันทึกกิจกรรม">
      <ResourceState {...audit} onRetry={() => setRefresh((value) => value + 1)} />
      {audit.data && (audit.data.logs?.length ? <div className="table-responsive"><table className="table"><thead><tr><th>เวลา</th><th>ผู้ดำเนินการ</th><th>กิจกรรม</th><th>รายการ</th><th>รายละเอียด</th></tr></thead><tbody>
        {audit.data.logs.map((log) => <tr key={log.id}><td>{log.createdAt}</td><td>{log.actorName}</td><td>{log.action}</td><td>{log.entityType} · {log.entityId}</td><td>{typeof log.details === 'string' ? log.details : JSON.stringify(log.details ?? '')}</td></tr>)}
      </tbody></table></div> : <Empty>ไม่มีบันทึกกิจกรรม</Empty>)}
    </Panel>
  </Dashboard>;
}
