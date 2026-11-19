import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCustomerData } from './customerContext';
import { api, getServiceLabel } from './StaffDashboardUtils';
import './TechnicianTheme.css';

const pollingInterval = 30_000;

export default function TechnicianJobNotifications() {
  const { user } = useCustomerData();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const storageKey = `aeroservice:technician-notifications:${user?.id}`;

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const result = await api('/technician/tasks');
        if (!Array.isArray(result.tasks)) {
          throw new Error('Backend ส่งรายการงานในรูปแบบที่ไม่ถูกต้อง');
        }

        const currentTasks = result.tasks.filter((task) => task.id != null);
        const storedIds = window.localStorage.getItem(`${storageKey}:known`);
        const previousIds = storedIds === null ? null : new Set(JSON.parse(storedIds));
        const storedNotifications = window.localStorage.getItem(`${storageKey}:items`);
        const previousNotifications = storedNotifications === null ? [] : JSON.parse(storedNotifications);
        if (!Array.isArray(previousNotifications)) {
          throw new Error('ข้อมูลแจ้งเตือนในเบราว์เซอร์ไม่ถูกต้อง');
        }

        const newNotifications = previousIds === null ? [] : currentTasks
          .filter((task) => !previousIds.has(String(task.id)))
          .map((task) => ({
            id: String(task.id),
            serviceType: getServiceLabel(task.serviceType, task.issue),
            date: task.date || '',
            read: false,
          }));
        const nextNotifications = [...newNotifications, ...previousNotifications]
          .filter((notification, index, list) => list.findIndex((item) => item.id === notification.id) === index)
          .slice(0, 20);
        const nextIds = new Set([...(previousIds || []), ...currentTasks.map((task) => String(task.id))]);

        window.localStorage.setItem(`${storageKey}:known`, JSON.stringify([...nextIds]));
        window.localStorage.setItem(`${storageKey}:items`, JSON.stringify(nextNotifications));
        if (active) {
          setNotifications(nextNotifications);
          setError('');
        }
      } catch (requestError) {
        if (active) setError(requestError.message || 'โหลดการแจ้งเตือนไม่สำเร็จ');
      }
    };

    refresh();
    const intervalId = window.setInterval(refresh, pollingInterval);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [storageKey]);

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const toggleNotifications = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen || unreadCount === 0) return;

    const readNotifications = notifications.map((notification) => ({ ...notification, read: true }));
    try {
      window.localStorage.setItem(`${storageKey}:items`, JSON.stringify(readNotifications));
      setNotifications(readNotifications);
    } catch (storageError) {
      setError(storageError.message || 'บันทึกสถานะแจ้งเตือนไม่สำเร็จ');
    }
  };

  return (
    <div className="staff-notifications">
      <button
        type="button"
        className="staff-notification-button"
        aria-label={unreadCount ? `การแจ้งเตือน งานใหม่ ${unreadCount} รายการ` : 'การแจ้งเตือน'}
        aria-expanded={open}
        onClick={toggleNotifications}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
        {unreadCount > 0 && <span className="staff-notification-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {open && (
        <section className="staff-notification-menu" aria-label="การแจ้งเตือนงานใหม่">
          <div className="d-flex align-items-center justify-content-between gap-2 px-3 py-2 border-bottom">
            <strong className="small">งานที่ได้รับมอบหมายใหม่</strong>
            <span className="small text-secondary">ตรวจทุก 30 วินาที</span>
          </div>
          {error && <p className="small text-danger px-3 pt-2 mb-0" role="alert">{error}</p>}
          {notifications.length === 0 ? (
            <p className="small text-secondary text-center px-3 py-4 mb-0">
              {error ? 'ไม่สามารถโหลดการแจ้งเตือนได้' : 'ยังไม่มีงานใหม่'}
            </p>
          ) : (
            <ul className="list-unstyled mb-0">
              {notifications.map((notification) => (
                <li key={notification.id} className="staff-notification-item">
                  <Link to="/technician" className="d-block text-decoration-none" onClick={() => setOpen(false)}>
                    <span className={`staff-notification-dot${notification.read ? ' is-read' : ''}`} aria-hidden="true" />
                    <span className="small fw-semibold text-dark">{notification.serviceType}</span>
                    <span className="d-block small text-secondary ms-3">
                      งาน #{notification.id}{notification.date ? ` · ${notification.date}` : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
