import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage, RegisterPage } from './components/AuthPages';
import { ForgotPasswordPage, ResetPasswordPage } from './components/PasswordResetPages';
import CustomerHome from './components/CustomerHome'; // นำเข้า Component ใหม่
import CustomerProfile from './components/CustomerProfile';
import { CustomerDataProvider } from './components/CustomerDataContext';
import { useCustomerData } from './components/customerContext';
import AccountantDashboard from './components/AccountantDashboard';
import AccountantProfile from './components/AccountantProfile';
import AdminDashboard from './components/AdminDashboard';
import AdminProfile from './components/AdminProfile';
import ManagerDashboard from './components/ManagerDashboard';
import ManagerProfile from './components/ManagerProfile';
import TechnicianDashboard from './components/TechnicianDashboard';
import TechnicianProfile from './components/TechnicianProfile';
import { normalizeRole, roleHome } from './components/roles';

function ProtectedRoute({ children, roles }) {
  const { user, authLoading } = useCustomerData();
  if (authLoading) {
    return <div className="p-5 text-center">กำลังตรวจสอบการเข้าสู่ระบบ...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(normalizeRole(user.role))) {
    return <Navigate to={roleHome(user.role)} replace />;
  }
  return children;
}

function HomeRedirect() {
  const { user, authLoading } = useCustomerData();
  if (authLoading) return <div className="p-5 text-center">กำลังตรวจสอบการเข้าสู่ระบบ...</div>;
  return <Navigate to={user ? roleHome(user.role) : '/login'} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <CustomerDataProvider>
        <div className="App bg-light min-vh-100 p-0 m-0">
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/home" element={<ProtectedRoute roles={['customer']}><CustomerHome /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute roles={['customer']}><CustomerProfile /></ProtectedRoute>} />
            <Route path="/technician" element={<ProtectedRoute roles={['technician']}><TechnicianDashboard /></ProtectedRoute>} />
            <Route path="/technician/profile" element={<ProtectedRoute roles={['technician']}><TechnicianProfile /></ProtectedRoute>} />
            <Route path="/accountant" element={<ProtectedRoute roles={['accountant']}><AccountantDashboard /></ProtectedRoute>} />
            <Route path="/accountant/profile" element={<ProtectedRoute roles={['accountant']}><AccountantProfile /></ProtectedRoute>} />
            <Route path="/manager" element={<ProtectedRoute roles={['store_manager']}><ManagerDashboard /></ProtectedRoute>} />
            <Route path="/manager/profile" element={<ProtectedRoute roles={['store_manager']}><ManagerProfile /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute roles={['system_admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/profile" element={<ProtectedRoute roles={['system_admin']}><AdminProfile /></ProtectedRoute>} />
            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </div>
      </CustomerDataProvider>
    </BrowserRouter>
  );
}

export default App;