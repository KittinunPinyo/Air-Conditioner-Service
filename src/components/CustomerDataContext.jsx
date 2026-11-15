import { useCallback, useEffect, useState } from 'react';
import { CustomerDataContext } from './customerData';

async function requestJson(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch {
    throw new Error('เชื่อมต่อ Backend ไม่ได้ กรุณาเปิด Backend และตรวจสอบการตั้งค่า Neon ใน Backend/.env');
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error('Backend ยังไม่พร้อมใช้งาน กรุณาเปิด Backend และตรวจสอบการตั้งค่า Neon ใน Backend/.env');
    }
    throw new Error(`Backend ส่งข้อมูลกลับมาไม่ถูกต้อง (HTTP ${response.status})`);
  }

  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload.message || `คำขอล้มเหลว (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

export function CustomerDataProvider({ children }) {
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [reviews, setReviews] = useState({});
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [error, setError] = useState('');

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const { bookings } = await requestJson('/bookings');
      if (!Array.isArray(bookings)) {
        throw new Error('Backend ส่งรายการงานในรูปแบบที่ไม่ถูกต้อง');
      }
      setJobs(bookings);
      setReviews(Object.fromEntries(
        bookings.filter((booking) => booking.review).map((booking) => [booking.id, booking.review]),
      ));
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    requestJson('/auth/me')
      .then(async ({ user: currentUser }) => {
        if (!currentUser?.id) throw new Error('ข้อมูลผู้ใช้จาก Backend ไม่ถูกต้อง');
        if (active) setUser(currentUser);
        await loadBookings();
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError.status === 401) {
          setUser(null);
          setAuthError('');
          return;
        }
        setAuthError(requestError.message);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadBookings]);

  const login = async (credentials) => {
    const { user: signedInUser } = await requestJson('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (!signedInUser?.id) throw new Error('Backend ไม่ได้ส่งข้อมูลผู้ใช้กลับมา');
    setUser(signedInUser);
    setAuthError('');
    await loadBookings();
  };

  const register = async (details) => {
    const { user: registeredUser } = await requestJson('/auth/register', {
      method: 'POST',
      body: JSON.stringify(details),
    });
    if (!registeredUser?.id) throw new Error('Backend ไม่ได้ส่งข้อมูลผู้ใช้กลับมา');
    setUser(registeredUser);
    setAuthError('');
    await loadBookings();
  };

  const requestPasswordReset = async (email) => requestJson('/auth/password/forgot', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

  const resetPassword = async (details) => requestJson('/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify(details),
  });

  const logout = async () => {
    await requestJson('/auth/logout', { method: 'POST' });
    setUser(null);
    setJobs([]);
    setReviews({});
    setError('');
  };

  const addBooking = async (booking) => {
    const { booking: newJob } = await requestJson('/bookings', {
      method: 'POST',
      body: JSON.stringify(booking),
    });
    if (!newJob?.id) throw new Error('Backend ไม่ได้ส่งข้อมูลงานกลับมา');
    setError('');
    setJobs((currentJobs) => [newJob, ...currentJobs]);
    return newJob;
  };

  const saveReview = async (jobId, review) => {
    const { review: savedReview } = await requestJson(`/bookings/${encodeURIComponent(jobId)}/reviews`, {
      method: 'POST',
      body: JSON.stringify(review),
    });
    if (!savedReview) throw new Error('Backend ไม่ได้ส่งข้อมูลรีวิวกลับมา');
    setError('');
    setReviews((currentReviews) => ({ ...currentReviews, [jobId]: savedReview }));
  };

  return (
    <CustomerDataContext.Provider value={{
      user,
      jobs,
      reviews,
      authLoading,
      loading,
      authError,
      error,
      login,
      register,
      requestPasswordReset,
      resetPassword,
      logout,
      addBooking,
      saveReview,
    }}>
      {children}
    </CustomerDataContext.Provider>
  );
}
