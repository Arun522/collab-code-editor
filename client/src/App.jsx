import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import EditorRoom from './pages/EditorRoom';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/room/:slug" element={<ProtectedRoute><EditorRoom /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} />} />
    </Routes>
  );
}
