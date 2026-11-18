import { useEffect, useState } from 'react';

export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: 'same-origin',
      headers: options.body instanceof FormData
        ? options.headers
        : { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new Error('เชื่อมต่อบริการไม่ได้ กรุณาลองอีกครั้ง');
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Backend ส่งข้อมูลไม่ถูกต้อง (HTTP ${response.status})`);
  }
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || `คำขอล้มเหลว (${response.status})`);
  return payload;
}

export function useResource(path, refresh = 0) {
  const [result, setResult] = useState({ key: '', data: null, error: '' });
  const key = `${path}:${refresh}`;
  useEffect(() => {
    let active = true;
    api(path)
      .then((data) => { if (active) setResult({ key, data, error: '' }); })
      .catch((requestError) => { if (active) setResult({ key, data: null, error: requestError.message }); });
    return () => { active = false; };
  }, [path, refresh, key]);
  return {
    data: result.key === key ? result.data : null,
    loading: result.key !== key,
    error: result.key === key ? result.error : '',
  };
}

export function useMutation() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const run = async (operation, successMessage = 'บันทึกเรียบร้อย') => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await operation();
      setSuccess(successMessage);
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, run, error, success };
}

export const today = () => new Date().toLocaleDateString('en-CA');
export const monthStart = () => `${today().slice(0, 7)}-01`;
