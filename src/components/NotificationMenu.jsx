import { useState } from 'react';
import { Link } from 'react-router-dom';
import './TechnicianTheme.css';

export default function NotificationMenu({
  notifications,
  setNotifications,
  storageKey,
  error,
  setError,
  title,
  emptyText,
  href,
  ariaLabel,
  customer = false,
}) {
  const [open, setOpen] = useState(false);
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
    <div className={`staff-notifications${customer ? ' customer-notifications' : ''}`}>
      <button
        type="button"
        className={customer ? 'customer-notification-button' : 'staff-notification-button'}
        aria-label={unreadCount ? `${ariaLabel} ${unreadCount} รายการ` : ariaLabel}
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
        <section className="staff-notification-menu" aria-label={title}>
          <div className="d-flex align-items-center justify-content-between gap-2 px-3 py-2 border-bottom">
            <strong className="small">{title}</strong>
            <span className="small text-secondary">ตรวจทุก 30 วินาที</span>
          </div>
          {error && <p className="small text-danger px-3 pt-2 mb-0" role="alert">{error}</p>}
          {notifications.length === 0 ? (
            <p className="small text-secondary text-center px-3 py-4 mb-0">
              {error ? 'ไม่สามารถโหลดการแจ้งเตือนได้' : emptyText}
            </p>
          ) : (
            <ul className="list-unstyled mb-0">
              {notifications.map((notification) => (
                <li key={notification.key} className="staff-notification-item">
                  <Link to={href} className="d-block text-decoration-none" onClick={() => setOpen(false)}>
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
