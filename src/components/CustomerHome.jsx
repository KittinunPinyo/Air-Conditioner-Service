import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './CustomerTheme.css';
import {
  formatDate,
  getLocalDate,
  jobStages,
  useCustomerData,
} from './customerContext';
import { LogoutButton } from './AuthPages';

export default function CustomerHome() {
  const { user, jobs, addBooking, loading: jobsLoading, error: jobsError } = useCustomerData();
  const [pricingRetry, setPricingRetry] = useState(0);
  const [pricingResult, setPricingResult] = useState({ version: null, settings: null, error: '' });
  const [categoriesRetry, setCategoriesRetry] = useState(0);
  const [categoriesResult, setCategoriesResult] = useState({ version: null, categories: null, error: '' });
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [acType, setAcType] = useState('wall');
  const [btu, setBtu] = useState('9000');
  const [issue, setIssue] = useState('clean'); 
  const [installWork, setInstallWork] = useState('new'); 
  const [appointmentDate, setAppointmentDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('morning');
  const [address, setAddress] = useState('');
  const [bookingNotice, setBookingNotice] = useState('');
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/pricing', { credentials: 'same-origin' })
      .then(async (response) => {
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error(`Backend ส่งข้อมูลราคากลับมาไม่ถูกต้อง (HTTP ${response.status})`);
        }
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || `โหลดราคาบริการไม่สำเร็จ (${response.status})`);
        const settings = payload.settings;
        const numericKeys = [
          'repairBaseSmall', 'repairBaseLarge', 'ceilingFee', 'installWall', 'installCeiling',
          'largeBtuSurcharge', 'moveMin', 'moveMax',
        ];
        const validSettings = settings && numericKeys.every((key) => Number.isFinite(settings[key]))
          && settings.issueSurcharge
          && ['clean', 'not_cold', 'leaking', 'not_working'].every((key) => Number.isFinite(settings.issueSurcharge[key]));
        if (!validSettings) throw new Error('Backend ส่งการตั้งราคามาไม่ครบถ้วน');
        return settings;
      })
      .then((settings) => { if (active) setPricingResult({ version: pricingRetry, settings, error: '' }); })
      .catch((requestError) => {
        if (active) setPricingResult({ version: pricingRetry, settings: null, error: requestError.message });
      });
    return () => { active = false; };
  }, [pricingRetry]);

  useEffect(() => {
    let active = true;
    fetch('/api/categories', { credentials: 'same-origin' })
      .then(async (response) => {
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error(`Backend ส่งหมวดหมู่บริการกลับมาไม่ถูกต้อง (HTTP ${response.status})`);
        }
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || `โหลดหมวดหมู่บริการไม่สำเร็จ (${response.status})`);
        if (!Array.isArray(payload.categories)
          || payload.categories.some((category) => !['repair', 'install'].includes(category.serviceType))) {
          throw new Error('Backend ส่งหมวดหมู่บริการมาไม่ถูกต้อง');
        }
        return payload.categories.filter((category) => category.isActive);
      })
      .then((categories) => { if (active) setCategoriesResult({ version: categoriesRetry, categories, error: '' }); })
      .catch((requestError) => {
        if (active) setCategoriesResult({ version: categoriesRetry, categories: null, error: requestError.message });
      });
    return () => { active = false; };
  }, [categoriesRetry]);

  const pricingLoading = pricingResult.version !== pricingRetry;
  const pricingSettings = pricingLoading ? null : pricingResult.settings;
  const pricingError = pricingLoading ? '' : pricingResult.error;
  const categoriesLoading = categoriesResult.version !== categoriesRetry;
  const categories = categoriesLoading ? null : categoriesResult.categories;
  const categoriesError = categoriesLoading ? '' : categoriesResult.error;
  const selectedCategory = categories?.find((category) => category.id === selectedCategoryId)
    || categories?.[0]
    || null;
  const serviceType = selectedCategory?.serviceType;

  const calculatePrice = () => {
    if (!pricingSettings || !serviceType) return null;
    let minPrice = 0;
    let maxPrice = 0;

    if (serviceType === 'repair') {
      const basePrice = Number(btu) <= 12000 ? pricingSettings.repairBaseSmall : pricingSettings.repairBaseLarge;
      const serviceFee = acType === 'ceiling' ? pricingSettings.ceilingFee : 0;
      minPrice = basePrice + serviceFee;
      maxPrice = minPrice + pricingSettings.issueSurcharge[issue];
    } 
    else if (serviceType === 'install') {
      const baseInstall = (acType === 'wall' ? pricingSettings.installWall : pricingSettings.installCeiling)
        + (Number(btu) >= 18000 ? pricingSettings.largeBtuSurcharge : 0);
      minPrice = installWork === 'move' ? baseInstall + pricingSettings.moveMin : baseInstall;
      maxPrice = installWork === 'move' ? baseInstall + pricingSettings.moveMax : baseInstall;
    }
    return { min: minPrice, max: maxPrice };
  };

  const price = calculatePrice();
  const activeJobs = jobs.filter((job) => job.status !== 'completed' && job.status !== 'cancelled');

  const getCategoryIcon = (categoryName = '', type = '') => {
    if (categoryName.includes('ล้าง')) {
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
        </svg>
      );
    }
    if (categoryName.includes('ติดตั้ง') || type === 'install') {
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
      );
    }
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    );
  };

  const handleBookingSubmit = async (event) => {
    event.preventDefault();
    setBookingNotice('');
    setBookingError('');
    if (!pricingSettings || pricingError || !selectedCategory || categoriesError) {
      setBookingError('ไม่สามารถยืนยันการจองได้จนกว่าจะโหลดราคาบริการและหมวดหมู่สำเร็จ');
      return;
    }
    try {
      const newJob = await addBooking({
        serviceType,
        acType,
        btu: Number(btu),
        issue: serviceType === 'repair' ? issue : '',
        installWork: serviceType === 'install' ? installWork : '',
        date: appointmentDate,
        timeSlot,
        address: address.trim(),
      });

      setBookingNotice(`บันทึกการจอง ${newJob.id} แล้ว`);
      setAppointmentDate('');
      setAddress('');
    } catch (requestError) {
      setBookingError(requestError.message);
    }
  };

  return (
    <div className="customer-theme min-vh-100 pb-5">
      
      {/* Navbar ดีไซน์กระจกใสพร้อมโลโก้ AeroService และปุ่มโปรไฟล์ */}
      <nav className="navbar navbar-expand-lg customer-navbar py-3 px-3 px-md-4 mb-4 sticky-top">
        <div className="container-fluid max-w-7xl mx-auto">
          <Link className="customer-brand-logo" to="/home">
            <div className="customer-brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/>
                <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.25"/>
              </svg>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="customer-brand-text">AeroService</span>
              <span className="customer-brand-tag d-none d-sm-inline-block">Air Care</span>
            </div>
          </Link>
          <div className="d-flex align-items-center gap-2 gap-sm-3">
            <Link to="/profile" className="customer-user-chip">
              <span className="customer-avatar">
                {user.fullName.charAt(0)}
              </span>
              <span className="customer-user-name d-none d-md-block">{user.fullName}</span>
            </Link>
            <LogoutButton />
          </div>
        </div>
      </nav>

      {/* เนื้อหาหลัก */}
      <div className="container">
        <div className="row g-4">
          
          {/* ==========================================
              คอลัมน์ซ้าย: ฟอร์มจองคิว 
              ========================================== */}
          <div className="col-12 col-lg-7">
            <div className="card customer-card border-0 p-4 p-md-5 h-100 position-relative">
              
              <div className="mb-4">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <div className="customer-card-badge">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <h3 className="fw-bolder mb-0 customer-card-title">จองคิวเรียกช่าง</h3>
                </div>
                <p className="text-muted small mb-0 ms-1">เลือกบริการที่ต้องการและประเมินราคาทันที</p>
              </div>

              <div className="mb-4">
                <label className="customer-form-label">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                  เลือกหมวดหมู่บริการ
                </label>
                {categoriesLoading ? (
                  <p className="small text-muted mb-0" role="status">กำลังโหลดหมวดหมู่บริการ…</p>
                ) : categoriesError ? (
                  <div className="alert alert-danger small mb-0" role="alert">
                    <p className="mb-2">{categoriesError}</p>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setCategoriesRetry((value) => value + 1)}>ลองอีกครั้ง</button>
                  </div>
                ) : categories?.length ? (
                  <div className="customer-category-tabs">
                    {categories.map((category) => {
                      const isActive = selectedCategory?.id === category.id;
                      return (
                        <button
                          key={category.id}
                          type="button"
                          aria-pressed={isActive}
                          className={`customer-category-tab ${isActive ? 'active' : ''}`}
                          onClick={() => { setSelectedCategoryId(category.id); setBookingNotice(''); setBookingError(''); }}
                        >
                          {getCategoryIcon(category.name, category.serviceType)}
                          <span>{category.name}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="small text-danger mb-0" role="alert">ไม่มีหมวดหมู่บริการที่เปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ</p>
                )}
                {selectedCategory && (
                  <div className="d-flex align-items-center gap-2 mt-2 ms-1">
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: '0.72rem' }}>
                      {selectedCategory.serviceType === 'repair' ? 'หมวดงานซ่อม / บำรุงรักษา' : 'หมวดงานติดตั้ง / ย้าย'}
                    </span>
                    <span className="small text-muted">
                      ประเภทบริการ: {selectedCategory.serviceType === 'repair' ? 'ซ่อม / ล้างแอร์' : 'ติดตั้ง / ย้ายแอร์'}
                    </span>
                  </div>
                )}
              </div>

              {/* แบบฟอร์มกรอกข้อมูล */}
              <form onSubmit={handleBookingSubmit} onChange={() => { setBookingNotice(''); setBookingError(''); }}>
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="customer-form-label">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="5" width="20" height="11" rx="2"/>
                      <path d="M6 16v2M18 16v2M7 10h10"/>
                    </svg>
                    ประเภทเครื่อง
                  </label>
                  <select
                    className="form-select customer-select fw-semibold"
                    value={acType}
                    onChange={(e) => setAcType(e.target.value)}
                  >
                    <option value="wall">แอร์ติดผนัง (Wall Type)</option>
                    <option value="ceiling">แอร์แขวนฝ้า/ตั้งพื้น</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="customer-form-label">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                    ขนาด BTU
                  </label>
                  <select
                    className="form-select customer-select fw-semibold"
                    value={btu}
                    onChange={(e) => setBtu(e.target.value)}
                  >
                    <option value="9000">9,000 - 12,000 BTU</option>
                    <option value="18000">18,000 - 24,000 BTU</option>
                    <option value="30000">30,000 BTU ขึ้นไป</option>
                  </select>
                </div>

                {serviceType === 'repair' && (
                  <div className="col-12 mt-3">
                    <label className="customer-form-label">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      อาการเสียเบื้องต้น
                    </label>
                    <select
                      className="form-select customer-select fw-semibold"
                      value={issue}
                      onChange={(e) => setIssue(e.target.value)}
                    >
                      <option value="clean">ล้างแอร์ประจำปี (แอร์เย็นปกติ)</option>
                      <option value="not_cold">แอร์ไม่เย็น / มีแต่ลมร้อน</option>
                      <option value="leaking">น้ำหยดจากตัวเครื่อง</option>
                      <option value="not_working">เปิดไม่ติด / เบรกเกอร์ทริป</option>
                    </select>
                  </div>
                )}

                {serviceType === 'install' && (
                  <div className="col-12 mt-3">
                    <label className="customer-form-label">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                      </svg>
                      ลักษณะงานติดตั้ง
                    </label>
                    <select
                      className="form-select customer-select fw-semibold"
                      value={installWork}
                      onChange={(e) => setInstallWork(e.target.value)}
                    >
                      <option value="new">ติดตั้งแอร์ใหม่ (มีเครื่องแล้ว)</option>
                      <option value="move">ย้ายจุดติดตั้ง (รื้อถอน + ติดใหม่)</option>
                    </select>
                  </div>
                )}

                <hr className="my-3 opacity-10" />

                <div className="col-md-6">
                  <label className="customer-form-label">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    วันที่ต้องการช่าง
                  </label>
                  <input
                    type="date"
                    className="form-control customer-input fw-semibold"
                    min={getLocalDate()}
                    value={appointmentDate}
                    onChange={(event) => setAppointmentDate(event.target.value)}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="customer-form-label">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    เวลาที่สะดวก
                  </label>
                  <select
                    className="form-select customer-select fw-semibold"
                    value={timeSlot}
                    onChange={(event) => setTimeSlot(event.target.value)}
                  >
                    <option value="morning">ช่วงเช้า (09:00 - 12:00)</option>
                    <option value="afternoon">ช่วงบ่าย (13:00 - 17:00)</option>
                  </select>
                </div>
                <div className="col-12 mt-3">
                  <label className="customer-form-label">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    ที่อยู่ / พิกัด
                  </label>
                  <textarea
                    className="form-control customer-input fw-semibold"
                    rows="2"
                    placeholder="ระบุบ้านเลขที่, ถนน, ซอย, เขต/อำเภอ, จังหวัด หรือจุดสังเกต..."
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    minLength={8}
                    required
                  ></textarea>
                </div>
              </div>

              {/* กล่องประเมินราคาดีไซน์ระดับพรีเมียม */}
              <div className="customer-price-box mb-4 text-center">
                <svg className="customer-price-watermark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="12" y1="2" x2="12" y2="22"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                  <line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/>
                  <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.25"/>
                </svg>
                
                <div className="d-flex justify-content-center position-relative z-1">
                  <div className="customer-price-badge">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                    <span>{serviceType === 'repair' ? 'ราคาประเมินค่าแรง / ซ่อมเบื้องต้น' : 'ราคาประเมินค่าแรงติดตั้ง'}</span>
                  </div>
                </div>

                {pricingLoading ? (
                  <p className="mb-1 py-2 position-relative z-1" role="status">กำลังโหลดราคาจากระบบ…</p>
                ) : pricingError ? (
                  <div className="position-relative z-1 py-2" role="alert">
                    <p className="mb-2">{pricingError}</p>
                    <button type="button" className="btn btn-sm btn-light fw-bold" onClick={() => setPricingRetry((value) => value + 1)}>ลองโหลดราคาอีกครั้ง</button>
                  </div>
                ) : price && (
                  <h1 className="customer-price-amount position-relative z-1">
                    {price.min === price.max
                      ? `${price.min.toLocaleString()} ฿`
                      : `${price.min.toLocaleString()} - ${price.max.toLocaleString()} ฿`}
                  </h1>
                )}

                <div className="d-flex align-items-center justify-content-center gap-1 small text-white-50 position-relative z-1 mt-1" style={{ fontSize: '0.78rem' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  <span>*ราคาเป็นเพียงการประเมินเบื้องต้น ยังไม่รวมค่าอะไหล่และค่าใช้จ่ายส่วนเกิน</span>
                </div>
              </div>

              {/* ปุ่มกดยืนยันการจอง */}
              <button
                type="submit"
                disabled={jobsLoading || pricingLoading || Boolean(pricingError) || !price || categoriesLoading || Boolean(categoriesError) || !selectedCategory}
                className="customer-submit-btn"
              >
                {categoriesLoading ? 'กำลังโหลดหมวดหมู่...' : categoriesError || !selectedCategory ? 'ไม่สามารถโหลดหมวดหมู่ได้' : pricingLoading ? 'กำลังโหลดราคา...' : pricingError ? 'ไม่สามารถโหลดราคาได้' : jobsLoading ? 'กำลังโหลดข้อมูล...' : (
                  <>
                    <span>ยืนยันการจองคิวช่าง</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </>
                )}
              </button>
              {bookingNotice && <div className="alert alert-success mt-3 mb-0 small rounded-3 shadow-sm border-0" role="status">{bookingNotice}</div>}
              {bookingError && <div className="alert alert-danger mt-3 mb-0 small rounded-3 shadow-sm border-0" role="alert">{bookingError}</div>}
              </form>
            </div>
          </div>

          {/* ==========================================
              คอลัมน์ขวา: ติดตามสถานะงาน (Tracking)
              ========================================== */}
          <div className="col-12 col-lg-5">
            <div className="card customer-card border-0 p-4 p-md-4 h-100 d-flex flex-column">
              
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-2">
                  <div className="customer-card-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10 9 9 9 8 9"/>
                    </svg>
                  </div>
                  <h5 className="fw-bolder mb-0 customer-card-title">สถานะงานของคุณ</h5>
                  <span className="customer-live-beacon ms-1">
                    <span className="customer-live-dot"></span>
                    <span>เรียลไทม์</span>
                  </span>
                </div>
                <Link to="/profile" className="btn btn-sm btn-outline-primary rounded-pill px-3 fw-semibold text-decoration-none">
                  ดูประวัติ →
                </Link>
              </div>

              {jobsError && <div className="alert alert-danger small rounded-3" role="alert">{jobsError}</div>}
              
              {jobsLoading ? (
                <div className="text-center py-5 my-auto">
                  <div className="spinner-border text-primary spinner-border-sm mb-2" role="status"></div>
                  <p className="text-muted small mb-0">กำลังโหลดข้อมูลงาน...</p>
                </div>
              ) : activeJobs.length === 0 ? (
                <div className="customer-empty-state my-auto">
                  <div className="customer-empty-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="5" width="20" height="11" rx="2"/>
                      <path d="M6 16v2M18 16v2M7 10h10M7 13h10"/>
                    </svg>
                  </div>
                  <h6 className="fw-bold mb-1" style={{ color: '#1e3a5f' }}>ยังไม่มีงานที่กำลังดำเนินการ</h6>
                  <p className="text-muted small mb-0" style={{ maxWidth: '320px', margin: '0 auto', lineHeight: 1.5 }}>
                    เมื่อส่งคำขอจองคิวช่างแล้ว ระบบจะแสดงสถานะและขั้นตอนการปฏิบัติงานที่นี่แบบเรียลไทม์
                  </p>
                </div>
              ) : activeJobs.map((job) => {
                const currentStage = jobStages.findIndex((stage) => stage.key === job.status);
                const statusClass = job.status === 'pending' ? 'bg-warning text-dark' :
                  job.status === 'traveling' ? 'bg-primary text-white' : 'bg-info text-dark';

                return (
                  <div key={job.id} className="p-3 mb-3 border rounded-4" style={{ backgroundColor: '#f8fbff', borderColor: '#e2edf9' }}>
                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                      <div>
                        <span className={`badge ${statusClass} px-2 py-1 rounded-pill mb-2 fw-semibold`} style={{ fontSize: '0.75rem' }}>
                          {jobStages[currentStage]?.label}
                        </span>
                        <h6 className="fw-bold mb-0 text-dark">{job.id}</h6>
                      </div>
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle fw-bold">
                        {job.serviceType === 'install' ? 'ติดตั้ง / ย้ายแอร์' : job.issue === 'clean' ? 'ล้างแอร์' : 'งานซ่อม'}
                      </span>
                    </div>
                    <p className="text-muted small mb-1">
                      <strong className="text-dark">นัดหมาย:</strong> {formatDate(job.date)} | {job.timeSlot === 'morning' ? 'ช่วงเช้า' : 'ช่วงบ่าย'}
                    </p>
                    <p className="text-muted small mb-1">
                      <strong className="text-dark">เครื่อง:</strong> {job.btu.toLocaleString()} BTU
                    </p>
                    {job.technician && <p className="text-muted small mb-1"><strong className="text-dark">ทีมช่าง:</strong> {job.technician}</p>}
                    <p className="text-muted small mb-3">
                      <strong className="text-dark">ราคาประเมิน:</strong> {job.estimatedPrice.min.toLocaleString()}
                      {job.estimatedPrice.min !== job.estimatedPrice.max && ` - ${job.estimatedPrice.max.toLocaleString()}`} ฿
                    </p>

                    <div className="border-top pt-3" style={{ borderColor: '#e2edf9' }} aria-label={`ไทม์ไลน์สถานะ ${job.id}`}>
                      {jobStages.map((stage, index) => {
                        const isComplete = index < currentStage;
                        const isCurrent = index === currentStage;
                        const nodeClass = isComplete ? 'complete' : isCurrent ? 'current' : 'waiting';

                        return (
                          <div key={stage.key} className="d-flex align-items-center gap-2 mb-2">
                            <span className={`customer-stepper-node ${nodeClass}`}>
                              {isComplete ? '✓' : index + 1}
                            </span>
                            <span className={`small ${isCurrent ? 'fw-bold text-primary' : 'text-muted'}`}>{stage.label}</span>
                            {isCurrent && <span className="badge bg-primary-subtle text-primary ms-auto" style={{ fontSize: '0.7rem' }}>สถานะปัจจุบัน</span>}
                          </div>
                        );
                      })}
                    </div>
                    {job.status === 'traveling' && (
                      <p className="small text-muted mb-0 mt-2 bg-white p-2 rounded-3 border">
                        📍 การติดตามตำแหน่งช่างแบบเรียลไทม์จะเปิดใช้งานเมื่อเชื่อมต่อระบบ
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Banner โปรโมท */}
              <div className="customer-promo-card mt-auto text-center">
                <div className="d-flex align-items-center justify-content-center gap-1 mb-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <h6 className="customer-promo-title mb-0">บริการดูแลเครื่องปรับอากาศครบวงจร</h6>
                </div>
                <p className="customer-promo-desc mb-2">จองคิว ประเมินราคา และติดตามสถานะงานได้ในที่เดียว</p>
                <div className="customer-promo-tags">
                  <span className="customer-promo-tag">✓ ช่างชำนาญการ</span>
                  <span className="customer-promo-tag">✓ รับประกันงานซ่อม</span>
                  <span className="customer-promo-tag">✓ ราคาโปร่งใส</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ส่วนชำระเงินออนไลน์ */}
        <section className="card customer-payment-card border-0 p-4 mt-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-3">
              <div className="customer-brand-icon" style={{ width: '46px', height: '46px', borderRadius: '13px', background: 'linear-gradient(135deg, #0284c7 0%, #1d4ed8 100%)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2"/>
                  <line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
              </div>
              <div>
                <div className="d-flex align-items-center gap-2">
                  <h5 className="fw-bolder mb-0" style={{ color: '#0c2b5e' }}>ชำระเงินออนไลน์</h5>
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill" style={{ fontSize: '0.72rem' }}>PromptPay & QR</span>
                </div>
                <p className="small text-muted mb-0 mt-1">กำลังวางแผนรองรับการแนบสลิปและชำระผ่าน QR Code หลังจบงานอย่างสะดวกและปลอดภัย</p>
              </div>
            </div>
            <span className="customer-pill-soon">เร็ว ๆ นี้</span>
          </div>
        </section>
      </div>
    </div>
  );
}