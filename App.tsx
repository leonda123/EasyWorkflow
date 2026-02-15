import React from 'react';
import Dashboard from './components/dashboard/Dashboard';
import EditorLayout from './components/layout/EditorLayout';
import LoginPage from './components/auth/LoginPage';
import { useAppStore } from './store/useAppStore';

function App() {
  const { currentView, isAuthenticated } = useAppStore();

  if (!isAuthenticated) {
      return <LoginPage />;
  }

  return (
    <>
      {currentView === 'dashboard' ? <Dashboard /> : <EditorLayout />}
    </>
  );
}

export default App;