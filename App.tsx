import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Dashboard from './components/dashboard/Dashboard';
import EditorLayout from './components/layout/EditorLayout';
import LoginPage from './components/auth/LoginPage';
import { useAppStore } from './store/useAppStore';
import Toast from './components/common/Toast';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isAuthLoading, checkAuth } = useAppStore();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
          <span className="text-sm text-gray-500">加载中...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <>{children}</>;
};

const DashboardWrapper = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setDashboardTab, loadTeams, currentTeam } = useAppStore();

  useEffect(() => {
    const path = location.pathname;
    if (path === '/deployments') {
      setDashboardTab('deployments');
    } else if (path === '/executions') {
      setDashboardTab('executions');
    } else if (path === '/settings') {
      setDashboardTab('settings');
    } else if (path === '/admin') {
      setDashboardTab('admin');
    } else {
      setDashboardTab('workflows');
    }
  }, [location.pathname, setDashboardTab]);

  return <Dashboard />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/workflows/:id" element={
          <ProtectedRoute>
            <EditorLayout />
          </ProtectedRoute>
        } />
        <Route path="/deployments" element={
          <ProtectedRoute>
            <DashboardWrapper />
          </ProtectedRoute>
        } />
        <Route path="/executions" element={
          <ProtectedRoute>
            <DashboardWrapper />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <DashboardWrapper />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <DashboardWrapper />
          </ProtectedRoute>
        } />
        <Route path="/" element={
          <ProtectedRoute>
            <DashboardWrapper />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
    </BrowserRouter>
  );
}

export default App;
