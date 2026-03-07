import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types';
import { hasAnyRole } from '@/lib/roles';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

/**
 * ProtectedRoute — blocks unauthenticated users and enforces RBAC.
 *
 * - No `allowedRoles` → any authenticated user can access.
 * - With `allowedRoles` → user's role must be in the list.
 * - Unauthenticated → redirected to /login.
 * - Unauthorized role → redirected to /unauthorized.
 */
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { isAuthenticated, user } = useAuthStore();
    const location = useLocation();

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !hasAnyRole(user.role, allowedRoles)) {
        return <UnauthorizedPage />;
    }

    return <>{children}</>;
}
