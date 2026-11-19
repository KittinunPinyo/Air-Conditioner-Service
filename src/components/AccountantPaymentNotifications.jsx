import { useEffect, useState } from 'react';
import { useCustomerData } from './customerContext';
import { api } from './StaffDashboardUtils';
import NotificationMenu from './NotificationMenu';

const pollingInterval = 30_000;

export default function AccountantPaymentNotifications() {
  const { user } = useCustomerData();
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');
  const storageKey = `aeroservice:accountant-payments:${user?.id}`;

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const result = await api('/accounting/payments');
        if (!Array.isArray(result.payments)) {
          throw new Error('Backend ส่งรายการชำระเงินในรูปแบบที่ไม่ถูกต้อง');
        }

        const currentPayments = Object.fromEntries(result.payments
          .filter((payment) => payment.id != null)
          .map((payment) => [String(payment.id), {
            status: payment.status,
            createdAt: payment.createdAt || '',
            jobId: payment.jobId || '',
            customerName: payment.customerName || '',
          }]));
        const storedPayments = window.localStorage.getItem(`${storageKey}:known`);
        const previousPayments = storedPayments === null ? null : JSON.parse(storedPayments);
        const storedNotifications = window.localStorage.getItem(`${storageKey}:items`);
        const previousNotifications = storedNotifications === null ? [] : JSON.parse(storedNotifications);
        if (previousPayments !== null && (!previousPayments || typeof previousPayments !== 'object' || Array.isArray(previousPayments))) {
          throw new Error('ข้อมูลรายการชำระเงินในเบราว์เซอร์ไม่ถูกต้อง');
        }
        if (!Array.isArray(previousNotifications)) {
          throw new Error('ข้อมูลแจ้งเตือนในเบราว์เซอร์ไม่ถูกต้อง');
        }

        const newNotifications = previousPayments === null ? [] : Object.entries(currentPayments)
          .filter(([id, payment]) => {
            const previous = previousPayments[id];
            return payment.status === 'pending'
              && (!previous || previous.status !== 'pending' || previous.createdAt !== payment.createdAt);
          })
          .map(([id, payment]) => ({
            key: `payment:${id}:${payment.createdAt}`,
            title: 'มีหลักฐานชำระเงินใหม่',
            detail: `${payment.jobId} · ${payment.customerName || 'ลูกค้า'} ส่งหลักฐานแล้ว`,
            read: false,
          }));
        const nextNotifications = [...newNotifications, ...previousNotifications]
          .filter((notification, index, list) => list.findIndex((item) => item.key === notification.key) === index)
          .slice(0, 20);
        window.localStorage.setItem(`${storageKey}:items`, JSON.stringify(nextNotifications));
        window.localStorage.setItem(`${storageKey}:known`, JSON.stringify(currentPayments));
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
      title="รายการชำระเงินใหม่"
      emptyText="ยังไม่มีหลักฐานชำระเงินใหม่"
      href="/accountant"
      ariaLabel="การแจ้งเตือนรายการชำระเงิน"
    />
  );
}
