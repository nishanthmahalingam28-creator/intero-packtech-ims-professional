import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { can } from '../utils/permissions';
import Spinner from '../components/ui/Spinner';

// AUTHENTICATION gate: must be logged in (and have an active profile).
export function ProtectedRoute({ children }) {
  const { profile, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;
  if (!profile) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

// AUTHORIZATION gate: must hold the permission for this page.
export function RoleRoute({ perm, children }) {
  const { profile } = useAuth();
  if (!can(profile.role, perm)) {
    return (
      <div className="card mx-auto mt-16 max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-red-500" />
        <h2 className="mt-4 text-lg font-semibold">Access denied</h2>
        <p className="mt-1 text-sm text-slate-500">Your role does not have permission to open this page.</p>
      </div>
    );
  }
  return children;
}
