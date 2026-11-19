import { useEffect, useState } from 'react';
import { useCustomerData } from './customerContext';
import { api, getServiceLabel } from './StaffDashboardUtils';
import NotificationMenu from './NotificationMenu';

const pollingInterval = 30_000;
const statusLabels = {
  pending: 'รอยืนยันคิว',
  traveling: 'ช่างกำลังเดินทาง',
  repairing: 'กำลังปฏิบัติงาน',
  completed: 'งานเสร็จสิ้น',
  cancelled: 'ยกเลิกงาน',
};
const paymentLabels = {
  approved: 'ตรวจสอบผ่านแล้ว',
  rejected: 'ตรวจสอบไม่ผ่าน',
};

export default function CustomerStatusNotifications() {
  const { user } = useCustomerData();
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');
  const storageKey = `aeroservice:customer-status:${user?.id}`;

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const result = await api('/bookings');
        if (!Array.isArray(result.bookings)) {
          throw new Error('Backend ส่งรายการงานในรูปแบบที่ไม่ถูกต้อง');
        }

        const currentStates = Object.fromEntries(result.bookings
          .filter((booking) => booking.id != null)
          .map((booking) => [String(booking.id), {
            serviceType: booking.serviceType,
            issue: booking.issue,
            status: booking.status || '',
            technician: booking.technician || '',
            paymentStatus: booking.paymentStatus || '',
          }]));
        const storedStates = window.localStorage.getItem(`${storageKey}:known`);
        const previousStates = storedStates === null ? null : JSON.parse(storedStates);
        const storedNotifications = window.localStorage.getItem(`${storageKey}:items`);
        const previousNotifications = storedNotifications === null ? [] : JSON.parse(storedNotifications);
        if (previousStates !== null && (!previousStates || typeof previousStates !== 'object' || Array.isArray(previousStates))) {
          throw new Error('ข้อมูลสถานะงานในเบราว์เซอร์ไม่ถูกต้อง');
        }
        if (!Array.isArray(previousNotifications)) {
          throw new Error('ข้อมูลแจ้งเตือนในเบราว์เซอร์ไม่ถูกต้อง');
        }

        const newNotifications = [];
        if (previousStates !== null) {
          Object.entries(currentStates).forEach(([id, current]) => {
            const previous = previousStates[id];
            if (!previous) return;
            const service = getServiceLabel(current.serviceType, current.issue);
            if (current.technician && current.technician !== previous.technician) {
              newNotifications.push({
                key: `${id}:technician:${current.technician}`,
                title: 'มอบหมายช่างแล้ว',
                detail: `${service} · งาน #${id} · ${current.technician}`,
                read: false,
              });
            }
            if (current.status && current.status !== previous.status) {
              newNotifications.push({
                key: `${id}:status:${current.status}`,
                title: 'อัปเดตสถานะงาน',
                detail: `${service} · งาน #${id} · ${statusLabels[current.status] || current.status}`,
                read: false,
              });
            }
            if (['approved', 'rejected'].includes(current.paymentStatus)
              && current.paymentStatus !== previous.paymentStatus) {
              newNotifications.push({
                key: `${id}:payment:${current.paymentStatus}`,
                title: 'ตรวจสอบการชำระเงินแล้ว',
                detail: `งาน #${id} · ${paymentLabels[current.paymentStatus]}`,
                read: false,
              });
            }
          });
        }

        const nextNotifications = [...newNotifications, ...previousNotifications]
          .filter((notification, index, list) => list.findIndex((item) => item.key === notification.key) === index)
          .slice(0, 20);
        window.localStorage.setItem(`${storageKey}:items`, JSON.stringify(nextNotifications));
        window.localStorage.setItem(`${storageKey}:known`, JSON.stringify(currentStates));
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

  return (
    <NotificationMenu
      notifications={notifications}
      setNotifications={setNotifications}
      storageKey={storageKey}
      error={error}
      setError={setError}
      title="อัปเดตงานของฉัน"
      emptyText="ยังไม่มีการอัปเดตงาน"
      href="/profile"
      ariaLabel="การแจ้งเตือนสถานะงาน"
      customer
    />
  );
}
