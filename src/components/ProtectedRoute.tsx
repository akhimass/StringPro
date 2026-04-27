import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { ProfileRole } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Allowed roles; user's role must be in this list. */
  allowedRoles: ProfileRole[];
}

/** Default app path for a profile role (staff dashboards vs public drop-off). */
export function homePathForRole(role: ProfileRole | null): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'frontdesk':
      return '/frontdesk';
    case 'stringer':
      return '/stringer';
    case 'frontdesk_stringer':
      return '/frontdesk';
    default:
      return '/';
  }
}

/**
 * If no session -> redirect to /login.
 * If session but role not allowed -> redirect to that user's home (not always `/`).
 */
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { session, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (role == null || !allowedRoles.includes(role)) {
    return <Navigate to={homePathForRole(role)} replace />;
  }

  return <>{children}</>;
}
