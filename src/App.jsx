import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage, RegisterPage } from './components/AuthPages';
import { ForgotPasswordPage, ResetPasswordPage } from './components/PasswordResetPages';
import CustomerHome from './components/CustomerHome'; // นำเข้า Component ใหม่
import CustomerProfile from './components/CustomerProfile';
import { CustomerDataProvider } from './components/CustomerDataContext';
import { useCustomerData } from './components/customerData';

function ProtectedRoute({ children }) {
  const { user, authLoading } = useCustomerData();
  if (authLoading) {
    return <div className="p-5 text-center">กำลังตรวจสอบการเข้าสู่ระบบ...</div>;
  }
  return user ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <CustomerDataProvider>
        <div className="App bg-light min-vh-100 p-0 m-0">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/home" element={<ProtectedRoute><CustomerHome /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><CustomerProfile /></ProtectedRoute>} />
          </Routes>
        </div>
      </CustomerDataProvider>
    </BrowserRouter>
  );
}

export default App;