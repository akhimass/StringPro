import type { ProfileRole } from '@/contexts/AuthContext';

/** Roles that may use staff-only API routes / RLS (not customers). */
export const STAFF_ROLES: ProfileRole[] = ['admin', 'frontdesk', 'stringer', 'frontdesk_stringer'];

export function isStaffRole(role: ProfileRole | null | undefined): boolean {
  return role != null && STAFF_ROLES.includes(role);
}

export function hasManagerAccess(role: ProfileRole | null | undefined): boolean {
  return role === 'admin';
}

export function hasStringerDashboardAccess(role: ProfileRole | null | undefined): boolean {
  return role === 'admin' || role === 'stringer' || role === 'frontdesk_stringer';
}

export function hasFrontDeskDashboardAccess(role: ProfileRole | null | undefined): boolean {
  return role === 'admin' || role === 'frontdesk' || role === 'frontdesk_stringer';
}
