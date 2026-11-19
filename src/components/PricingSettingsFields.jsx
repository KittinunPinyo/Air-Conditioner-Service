const issueLabels = {
  clean: 'ล้างแอร์',
  not_cold: 'แอร์ไม่เย็น',
  leaking: 'แอร์น้ำรั่ว',
  not_working: 'เครื่องไม่ทำงาน',
};

const settingLabels = {
  repairBaseSmall: 'ค่าซ่อมพื้นฐาน (เครื่องเล็ก)',
  repairBaseLarge: 'ค่าซ่อมพื้นฐาน (เครื่องใหญ่)',
  ceilingFee: 'ค่าบริการเพดาน',
  issueSurcharge: 'ค่าบริการเพิ่มตามอาการ',
  installWall: 'ค่าติดตั้งแบบติดผนัง',
  installCeiling: 'ค่าติดตั้งแบบแขวน/ฝังฝ้า',
  largeBtuSurcharge: 'ค่าบริการเพิ่ม BTU ขนาดใหญ่',
  moveMin: 'ย้ายเครื่อง (ต่ำสุด)',
  moveMax: 'ย้ายเครื่อง (สูงสุด)',
  commissionRate: 'อัตราคอมมิชชัน (%)',
};

export function PricingSettingsFields({ settings, setSettings }) {
  const repairKeys = ['repairBaseSmall', 'repairBaseLarge', 'ceilingFee'];
  const installKeys = ['installWall', 'installCeiling', 'largeBtuSurcharge', 'moveMin', 'moveMax'];
  const knownKeys = new Set([...repairKeys, ...installKeys, 'issueSurcharge', 'commissionRate']);
  const otherFields = Object.entries(settings || {}).filter(([key]) => !knownKeys.has(key));
  const renderField = (key, value) => (
    <label className="admin-pricing-field" key={key}>
      <span>{settingLabels[key] || key}</span>
      <input
        className="form-control"
        type="number"
        min="0"
        max={key === 'commissionRate' ? '100' : undefined}
        step={key === 'commissionRate' ? '0.01' : '1'}
        value={value ?? ''}
        onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.value }))}
      />
      {key === 'commissionRate' && <small>กำหนดเป็นเปอร์เซ็นต์ 0–100%</small>}
    </label>
  );
  const renderGroup = (title, keys) => {
    const fields = keys.filter((key) => Object.hasOwn(settings || {}, key));
    if (!fields.length) return null;
    return (
      <section className="admin-pricing-group" key={title}>
        <h3>{title}</h3>
        <div className="admin-pricing-fields">
          {fields.map((key) => renderField(key, settings[key]))}
        </div>
      </section>
    );
  };

  return (
    <div className="admin-pricing-layout">
      {renderGroup('งานซ่อมและล้างแอร์', repairKeys)}
      {settings?.issueSurcharge && (
        <section className="admin-pricing-group">
          <h3>{settingLabels.issueSurcharge}</h3>
          <div className="admin-pricing-fields">
            {Object.entries(settings.issueSurcharge).map(([issue, amount]) => (
              <label className="admin-pricing-field" key={issue}>
                <span>{issueLabels[issue] || issue}</span>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  step="1"
                  value={amount ?? ''}
                  onChange={(event) => setSettings((current) => ({
                    ...current,
                    issueSurcharge: { ...(current?.issueSurcharge || {}), [issue]: event.target.value },
                  }))}
                />
              </label>
            ))}
          </div>
        </section>
      )}
      {renderGroup('งานติดตั้งและย้ายแอร์', installKeys)}
      {renderGroup('ค่าตอบแทน', ['commissionRate'])}
      {otherFields.length > 0 && (
        <section className="admin-pricing-group">
          <h3>การตั้งค่าอื่น</h3>
          <div className="admin-pricing-fields">
            {otherFields.map(([key, value]) => renderField(key, value))}
          </div>
        </section>
      )}
    </div>
  );
}
