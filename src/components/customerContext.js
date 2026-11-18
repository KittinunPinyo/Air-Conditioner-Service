import { createContext, useContext } from 'react';

export const jobStages = [
  { key: 'pending', label: 'รอยืนยันคิว' },
  { key: 'traveling', label: 'ช่างกำลังเดินทาง' },
  { key: 'repairing', label: 'กำลังซ่อม' },
  { key: 'completed', label: 'เสร็จสิ้น' },
];

export const getLocalDate = (date = new Date()) => {
  const localDate = new Date(date);
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  return localDate.toISOString().slice(0, 10);
};

export const formatDate = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('th-TH', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export const CustomerDataContext = createContext(null);

export function useCustomerData() {
  const context = useContext(CustomerDataContext);
  if (!context) {
    throw new Error('useCustomerData must be used within CustomerDataProvider');
  }
  return context;
}
