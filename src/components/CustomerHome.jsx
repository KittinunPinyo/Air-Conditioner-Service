import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
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
    // พื้นหลังโทนขาวเหลือบฟ้าอ่อน
    <div className="min-vh-100 pb-5" style={{ backgroundColor: '#f4f9ff' }}>
      
      {/* Navbar ขาวคลีน พร้อมเงาบางๆ */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm py-3 px-4 mb-4 sticky-top">
        <div className="container-fluid max-w-7xl mx-auto">
          <Link className="navbar-brand fw-bolder fs-4" to="/home" style={{ color: '#0056b3' }}>
            <span className="text-primary fs-3 me-2">AeroService</span>
          </Link>
          <div className="d-flex align-items-center gap-3">
            <Link to="/profile" className="d-flex align-items-center gap-3 text-decoration-none">
              <span className="text-secondary fw-semibold d-none d-md-block small">{user.fullName}</span>
              <span className="text-white rounded-circle d-flex justify-content-center align-items-center fw-bold shadow-sm"
                    style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg, #0d6efd, #00b4d8)' }}>
                {user.fullName.charAt(0)}
              </span>
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
            <div className="card border-0 p-4 p-md-5 bg-white h-100 position-relative" 
                 style={{ borderRadius: '1.5rem', boxShadow: '0 10px 40px rgba(13, 110, 253, 0.05)' }}>
              
              <div className="mb-4">
                <h3 className="fw-bolder mb-1" style={{ color: '#003a7a' }}>จองคิวเรียกช่าง</h3>
                <p className="text-muted small mb-0">เลือกบริการที่ต้องการและประเมินราคาทันที</p>
              </div>

              <div className="mb-4">
                <label className="small fw-bold mb-2" style={{ color: '#0056b3' }}>เลือกหมวดหมู่บริการ</label>
                {categoriesLoading ? <p className="small text-muted mb-0" role="status">กำลังโหลดหมวดหมู่บริการ…</p>
                  : categoriesError ? <div className="alert alert-danger small mb-0" role="alert">
                    <p className="mb-2">{categoriesError}</p>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setCategoriesRetry((value) => value + 1)}>ลองอีกครั้ง</button>
                  </div>
                    : categories?.length ? <div className="d-flex flex-wrap gap-2 p-2" style={{ backgroundColor: '#e6f0ff', borderRadius: '1rem' }}>
                      {categories.map((category) => <button key={category.id} type="button"
                        aria-pressed={selectedCategory?.id === category.id}
                        className={`btn flex-fill fw-bold border-0 ${selectedCategory?.id === category.id ? 'bg-white shadow-sm text-primary' : 'text-muted bg-transparent'}`}
                        style={{ borderRadius: '0.8rem' }}
                        onClick={() => { setSelectedCategoryId(category.id); setBookingNotice(''); setBookingError(''); }}>
                        {category.name}
                      </button>)}
                    </div>
                      : <p className="small text-danger mb-0" role="alert">ไม่มีหมวดหมู่บริการที่เปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ</p>}
                {selectedCategory && <p className="small text-muted mt-2 mb-0">ประเภทบริการ: {selectedCategory.serviceType === 'repair' ? 'ซ่อม / ล้างแอร์' : 'ติดตั้ง / ย้ายแอร์'}</p>}
              </div>

              {/* แบบฟอร์มกรอกข้อมูล (ดีไซน์ช่องกรอกเป็นสีฟ้าอ่อนๆ) */}
              <form onSubmit={handleBookingSubmit} onChange={() => { setBookingNotice(''); setBookingError(''); }}>
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="small fw-bold mb-2" style={{ color: '#0056b3' }}>ประเภทเครื่อง</label>
                  <select className="form-select border-0 shadow-none fw-semibold" value={acType} onChange={(e) => setAcType(e.target.value)} 
                          style={{ borderRadius: '1rem', padding: '0.8rem', backgroundColor: '#f0f5fc', color: '#333' }}>
                    <option value="wall">แอร์ติดผนัง (Wall Type)</option>
                    <option value="ceiling">แอร์แขวนฝ้า/ตั้งพื้น</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="small fw-bold mb-2" style={{ color: '#0056b3' }}>ขนาด BTU</label>
                  <select className="form-select border-0 shadow-none fw-semibold" value={btu} onChange={(e) => setBtu(e.target.value)} 
                          style={{ borderRadius: '1rem', padding: '0.8rem', backgroundColor: '#f0f5fc', color: '#333' }}>
                    <option value="9000">9,000 - 12,000 BTU</option>
                    <option value="18000">18,000 - 24,000 BTU</option>
                    <option value="30000">30,000 BTU ขึ้นไป</option>
                  </select>
                </div>

                {serviceType === 'repair' && (
                  <div className="col-12 mt-3">
                    <label className="small fw-bold mb-2" style={{ color: '#0056b3' }}>อาการเสียเบื้องต้น</label>
                    <select className="form-select border-0 shadow-none fw-semibold" value={issue} onChange={(e) => setIssue(e.target.value)} 
                            style={{ borderRadius: '1rem', padding: '0.8rem', backgroundColor: '#f0f5fc', color: '#333' }}>
                      <option value="clean">ล้างแอร์ประจำปี (แอร์เย็นปกติ)</option>
                      <option value="not_cold">แอร์ไม่เย็น / มีแต่ลมร้อน</option>
                      <option value="leaking">น้ำหยดจากตัวเครื่อง</option>
                      <option value="not_working">เปิดไม่ติด / เบรกเกอร์ทริป</option>
                    </select>
                  </div>
                )}

                {serviceType === 'install' && (
                  <div className="col-12 mt-3">
                    <label className="small fw-bold mb-2" style={{ color: '#0056b3' }}>ลักษณะงานติดตั้ง</label>
                    <select className="form-select border-0 shadow-none fw-semibold" value={installWork} onChange={(e) => setInstallWork(e.target.value)} 
                            style={{ borderRadius: '1rem', padding: '0.8rem', backgroundColor: '#f0f5fc', color: '#333' }}>
                      <option value="new">ติดตั้งแอร์ใหม่ (มีเครื่องแล้ว)</option>
                      <option value="move">ย้ายจุดติดตั้ง (รื้อถอน + ติดใหม่)</option>
                    </select>
                  </div>
                )}

                <hr className="my-4 opacity-10" />

                <div className="col-md-6">
                  <label className="small fw-bold mb-2" style={{ color: '#0056b3' }}>วันที่ต้องการช่าง</label>
                  <input type="date" className="form-control border-0 shadow-none fw-semibold text-muted"
                         min={getLocalDate()} value={appointmentDate} onChange={(event) => setAppointmentDate(event.target.value)} required
                         style={{ borderRadius: '1rem', padding: '0.8rem', backgroundColor: '#f0f5fc' }} />
                </div>
                <div className="col-md-6">
                  <label className="small fw-bold mb-2" style={{ color: '#0056b3' }}>เวลาที่สะดวก</label>
                  <select className="form-select border-0 shadow-none fw-semibold text-muted" value={timeSlot}
                          onChange={(event) => setTimeSlot(event.target.value)}
                          style={{ borderRadius: '1rem', padding: '0.8rem', backgroundColor: '#f0f5fc' }}>
                    <option value="morning">ช่วงเช้า (09:00 - 12:00)</option>
                    <option value="afternoon">ช่วงบ่าย (13:00 - 17:00)</option>
                  </select>
                </div>
                <div className="col-12 mt-3">
                  <label className="small fw-bold mb-2" style={{ color: '#0056b3' }}>ที่อยู่ / พิกัด</label>
                  <textarea className="form-control border-0 shadow-none fw-semibold text-muted" rows="2" placeholder="ระบุบ้านเลขที่, ถนน, เขต..."
                            value={address} onChange={(event) => setAddress(event.target.value)} minLength={8} required
                            style={{ borderRadius: '1rem', padding: '0.8rem', backgroundColor: '#f0f5fc' }}></textarea>
                </div>
              </div>

              {/* กล่องประเมินราคา (ไล่สี Gradient น้ำเงิน-ฟ้า ดูหรูหรา) */}
              <div className="p-4 mb-4 text-center text-white position-relative overflow-hidden" 
                   style={{ borderRadius: '1rem', background: 'linear-gradient(135deg, #003a7a 0%, #0d6efd 100%)', boxShadow: '0 10px 20px rgba(13, 110, 253, 0.2)' }}>
                <div className="position-absolute top-0 end-0 opacity-25" style={{ fontSize: '100px', transform: 'translate(20%, -20%)' }}>❄️</div>
                <p className="fw-semibold mb-1 small text-white-50 position-relative z-1">
                  {serviceType === 'repair' ? 'ราคาประเมินค่าแรง/ซ่อมเบื้องต้น' : 'ราคาประเมินค่าแรงติดตั้ง'}
                </p>
                {pricingLoading ? <p className="mb-1 position-relative z-1" role="status">กำลังโหลดราคาจากระบบ…</p>
                  : pricingError ? <div className="position-relative z-1" role="alert">
                    <p className="mb-2">{pricingError}</p>
                    <button type="button" className="btn btn-sm btn-light" onClick={() => setPricingRetry((value) => value + 1)}>ลองโหลดราคาอีกครั้ง</button>
                  </div>
                    : price && <h1 className="fw-bolder mb-1 position-relative z-1">
                      {price.min === price.max
                        ? `${price.min.toLocaleString()} ฿`
                        : `${price.min.toLocaleString()} - ${price.max.toLocaleString()} ฿`}
                    </h1>}
                <p className="small mb-0 text-white-50 position-relative z-1" style={{ fontSize: '0.75rem' }}>
                  *ราคาเป็นเพียงการประเมินเบื้องต้น ยังไม่รวมค่าอะไหล่และค่าใช้จ่ายส่วนเกิน
                </p>
              </div>

              {/* ปุ่มกดยืนยัน (ขยายเต็ม ความโค้งมน รับกับกล่องราคา) */}
              <button 
                type="submit"
                disabled={jobsLoading || pricingLoading || Boolean(pricingError) || !price || categoriesLoading || Boolean(categoriesError) || !selectedCategory}
                className="btn w-100 fw-bold shadow-sm" 
                style={{ 
                  padding: '1.2rem', 
                  borderRadius: '1rem', 
                  fontSize: '1.1rem',
                  backgroundColor: '#e6f0ff',
                  color: '#0d6efd',
                  border: '2px solid transparent',
                  transition: 'all 0.3s ease'
                }}
              >
                {categoriesLoading ? 'กำลังโหลดหมวดหมู่...' : categoriesError || !selectedCategory ? 'ไม่สามารถโหลดหมวดหมู่ได้' : pricingLoading ? 'กำลังโหลดราคา...' : pricingError ? 'ไม่สามารถโหลดราคาได้' : jobsLoading ? 'กำลังโหลดข้อมูล...' : 'ยืนยันการจองคิวช่าง'}
              </button>
              {bookingNotice && <div className="alert alert-success mt-3 mb-0 small" role="status">{bookingNotice}</div>}
              {bookingError && <div className="alert alert-danger mt-3 mb-0 small" role="alert">{bookingError}</div>}
              </form>
            </div>
          </div>

          {/* ==========================================
              คอลัมน์ขวา: ติดตามสถานะงาน (Tracking)
              ========================================== */}
          <div className="col-12 col-lg-5">
            <div className="card border-0 p-4 bg-white h-100" style={{ borderRadius: '1.5rem', boxShadow: '0 10px 40px rgba(13, 110, 253, 0.05)' }}>
              
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bolder mb-0" style={{ color: '#003a7a' }}>สถานะงานของคุณ</h5>
                <Link to="/profile" className="text-primary text-decoration-none small fw-semibold">ดูประวัติ</Link>
              </div>

              {jobsError && <div className="alert alert-danger small" role="alert">{jobsError}</div>}
              {jobsLoading ? (
                <p className="text-muted small">กำลังโหลดข้อมูลงาน...</p>
              ) : activeJobs.length === 0 ? (
                <p className="text-muted small">ยังไม่มีงานที่กำลังดำเนินการ</p>
              ) : activeJobs.map((job) => {
                const currentStage = jobStages.findIndex((stage) => stage.key === job.status);
                const statusClass = job.status === 'pending' ? 'bg-warning text-dark' :
                  job.status === 'traveling' ? 'bg-primary' : 'bg-info text-dark';

                return (
                  <div key={job.id} className="p-3 mb-3" style={{ backgroundColor: '#f4f9ff', borderRadius: '1rem' }}>
                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                      <div>
                        <span className={`badge ${statusClass} px-2 py-1 rounded-pill mb-2 fw-normal`}>
                          {jobStages[currentStage]?.label}
                        </span>
                        <h6 className="fw-bold mb-0 text-dark">{job.id}</h6>
                      </div>
                      <span className="small fw-bold text-primary">
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

                    <div className="border-top pt-3" aria-label={`ไทม์ไลน์สถานะ ${job.id}`}>
                      {jobStages.map((stage, index) => {
                        const isComplete = index < currentStage;
                        const isCurrent = index === currentStage;
                        const circleClass = isComplete ? 'bg-success text-white' :
                          isCurrent ? 'bg-primary text-white' : 'bg-white text-secondary border';

                        return (
                          <div key={stage.key} className="d-flex align-items-center gap-2 mb-2">
                            <span className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${circleClass}`}
                                  style={{ width: '26px', height: '26px', fontSize: '0.75rem' }}>
                              {isComplete ? '✓' : index + 1}
                            </span>
                            <span className={`small ${isCurrent ? 'fw-bold text-primary' : 'text-muted'}`}>{stage.label}</span>
                            {isCurrent && <span className="badge bg-primary-subtle text-primary ms-auto">สถานะปัจจุบัน</span>}
                          </div>
                        );
                      })}
                    </div>
                    {job.status === 'traveling' && (
                      <p className="small text-muted mb-0 mt-2">การติดตามตำแหน่งช่างแบบเรียลไทม์จะเปิดใช้งานเมื่อเชื่อมต่อระบบ</p>
                    )}
                  </div>
                );
              })}

              {/* Banner โปรโมท (โทนฟ้าสว่าง) */}
              <div className="mt-auto rounded-4 p-4 text-center position-relative overflow-hidden" 
                   style={{ background: 'linear-gradient(135deg, #e6f0ff 0%, #cce0ff 100%)', border: '1px solid #b3d4ff' }}>
                <h6 className="fw-bolder mb-2" style={{ color: '#0056b3' }}>บริการดูแลเครื่องปรับอากาศครบวงจร</h6>
                <p className="small mb-0 text-muted" style={{ fontWeight: '500' }}>จองคิว ประเมินราคา และติดตามงานได้ในที่เดียว</p>
              </div>

            </div>
          </div>
        </div>

        <section className="card border-0 p-4 mt-4"
                     style={{ borderRadius: '1.5rem', background: 'linear-gradient(135deg, #e6f0ff 0%, #cce0ff 100%)' }}>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div>
                  <h5 className="fw-bolder mb-1" style={{ color: '#003a7a' }}>ชำระเงินออนไลน์</h5>
                  <p className="small text-muted mb-0">กำลังวางแผนรองรับการแนบสลิปและชำระผ่าน QR Code หลังจบงาน</p>
                </div>
                <button type="button" className="btn btn-outline-primary" disabled>เร็ว ๆ นี้</button>
              </div>
        </section>
      </div>
    </div>
  );
}