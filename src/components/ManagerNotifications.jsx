import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCustomerData } from './customerContext';
import { api, getServiceLabel } from './StaffDashboardUtils';
import './TechnicianTheme.css';

const pollingInterval = 30_000;

export default function ManagerNotifications() {
  const { user } = useCustomerData();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const storageKey = `aeroservice:manager-notifications:${user?.id}`;

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const [operations, requests] = await Promise.all([
          api('/manager/operations'),
          api('/manager/requests'),
        ]);
        if (!Array.isArray(operations.bookings) || !Array.isArray(requests.requests)) {
          throw new Error('Backend ส่งข้อมูลการแจ้งเตือนในรูปแบบที่ไม่ถูกต้อง');
        }

        const currentItems = [
          ...operations.bookings.filter((booking) => booking.id != null).map((booking) => ({
            key: `booking:${booking.id}`,
            title: getServiceLabel(booking.serviceType, booking.issue),
            detail: `รายการจองใหม่ · #${booking.id}`,
          })),
          ...requests.requests.filter((request) => request.id != null).map((request) => ({
            key: `request:${request.id}`,
            title: request.type === 'purchase' ? 'คำขอจัดซื้ออะไหล่' : 'คำขอส่วนลด',
            detail: `${request.requesterName || 'ช่าง'} · ${request.description || 'ส่งคำขอใหม่'}`,
          })),
        ];
        const storedIds = window.localStorage.getItem(`${storageKey}:known`);
        const previousIds = storedIds === null ? null : new Set(JSON.parse(storedIds));
        const storedNotifications = window.localStorage.getItem(`${storageKey}:items`);
        const previousNotifications = storedNotifications === null ? [] : JSON.parse(storedNotifications);
        if (!Array.isArray(previousNotifications)) {
          throw new Error('ข้อมูลแจ้งเตือนในเบราว์เซอร์ไม่ถูกต้อง');
        }

        const newNotifications = previousIds === null ? [] : currentItems
          .filter((item) => !previousIds.has(item.key))
          .map((item) => ({ ...item, read: false }));
        const nextNotifications = [...newNotifications, ...previousNotifications]
          .filter((notification, index, list) => list.findIndex((item) => item.key === notification.key) === index)
          .slice(0, 20);
        const nextIds = new Set([...(previousIds || []), ...currentItems.map((item) => item.key)]);

        window.localStorage.setItem(`${storageKey}:known`, JSON.stringify([...nextIds].slice(-1000)));
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
        aria-label={unreadCount ? `การแจ้งเตือนใหม่ ${unreadCount} รายการ` : 'การแจ้งเตือน'}
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
        <section className="staff-notification-menu" aria-label="การแจ้งเตือนใหม่">
          <div className="d-flex align-items-center justify-content-between gap-2 px-3 py-2 border-bottom">
            <strong className="small">รายการใหม่</strong>
            <span className="small text-secondary">ตรวจทุก 30 วินาที</span>
          </div>
          {error && <p className="small text-danger px-3 pt-2 mb-0" role="alert">{error}</p>}
          {notifications.length === 0 ? (
            <p className="small text-secondary text-center px-3 py-4 mb-0">
              {error ? 'ไม่สามารถโหลดการแจ้งเตือนได้' : 'ยังไม่มีรายการใหม่'}
            </p>
          ) : (
            <ul className="list-unstyled mb-0">
              {notifications.map((notification) => (
                <li key={notification.key} className="staff-notification-item">
                  <Link to="/manager" className="d-block text-decoration-none" onClick={() => setOpen(false)}>
                    <span className={`staff-notification-dot${notification.read ? ' is-read' : ''}`} aria-hidden="true" />
                    <span className="small fw-semibold text-dark">{notification.title}</span>
                    <span className="d-block small text-secondary ms-3">{notification.detail}</span>
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
