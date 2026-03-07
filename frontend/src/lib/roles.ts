import type { UserRole } from '@/types';

/**
 * Role hierarchy — higher index = more privileges.
 * Used for role-level comparison in RBAC checks.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
    user_employee: 0,
    editor_team_leader: 1,
    admin_manager: 2,
    super_admin: 3,
};

/**
 * Human-readable role labels
 */
export const ROLE_LABELS: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    admin_manager: 'Admin / Manager',
    editor_team_leader: 'Editor / Team Leader',
    user_employee: 'Employee',
};

/**
 * Check if a user role meets the minimum required role level
 */
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if a user role is in a list of allowed roles
 */
export function hasAnyRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
    return allowedRoles.includes(userRole);
}
