import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { ToastContainer } from './components/Toast';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { SharePage } from './pages/SharePage';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/s/:slug" element={<SharePage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer />
    </ToastProvider>
  );
}
