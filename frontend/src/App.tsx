import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layout
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ScreeningPage from './pages/Screening';
import ScreeningResult from './pages/ScreeningResult';
import HistoryPage from './pages/History';
import CasesPage from './pages/Cases';
import AnalyticsPage from './pages/Analytics';
import AuditPage from './pages/Audit';
import SettingsPage from './pages/Settings';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles: string[];
  user: { name: string; role: string; email: string } | null;
}> = ({ children, allowedRoles, user }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <DashboardLayout userRole={user.role} userName={user.name}>{children}</DashboardLayout>;
};

const App: React.FC = () => {
  const [user, setUser] = useState<{
    name: string;
    role: string;
    email: string;
  } | null>(null);
  
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');
    const name = localStorage.getItem('user_name');
    const email = localStorage.getItem('user_email');

    if (token && role && name && email) {
      setUser({
        name,
        role: role as any,
        email
      });
    }
    setCheckingAuth(false);
  }, []);

  const handleLoginSuccess = (userData: { name: string; role: string; email: string }) => {
    setUser(userData);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Verifying Security Session Token...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/dashboard" replace /> : <Login onLoginSuccess={handleLoginSuccess} />} 
        />

        {/* Protected Dashboard Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'OFFICER', 'ANALYST']} user={user}>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/screening" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'OFFICER']} user={user}>
              <ScreeningPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/screening/:id/result" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'OFFICER', 'ANALYST']} user={user}>
              <ScreeningResult />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/history" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'OFFICER', 'ANALYST']} user={user}>
              <HistoryPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/cases" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'OFFICER', 'ANALYST']} user={user}>
              <CasesPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'ANALYST']} user={user}>
              <AnalyticsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/audit" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'ANALYST']} user={user}>
              <AuditPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN']} user={user}>
              <SettingsPage />
            </ProtectedRoute>
          } 
        />

        {/* Fallback Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
