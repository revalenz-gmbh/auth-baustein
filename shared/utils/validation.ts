import type { UserRole } from '../types/user';
import { ROLE_PERMISSIONS } from '../constants/roles';

export const isEmailValid = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isPasswordStrong = (password: string): boolean => {
  // Mindestens 8 Zeichen, mindestens ein Großbuchstabe, ein Kleinbuchstabe und eine Zahl
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return strongPasswordRegex.test(password);
};

export const isValidTicketCode = (code: string): boolean => {
  // Ticket-Code sollte alphanumerisch sein und bestimmte Länge haben
  const codeRegex = /^[A-Z0-9]{6,12}$/;
  return codeRegex.test(code);
};

export const hasPermission = (
  userRole: UserRole,
  permission: keyof typeof ROLE_PERMISSIONS.ADMIN
): boolean => {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  return rolePermissions ? rolePermissions[permission] : false;
};

export const canAccessResource = (
  userRole: UserRole,
  resourceType: 'users' | 'tenants' | 'events' | 'tickets' | 'orders' | 'reports'
): boolean => {
  switch (resourceType) {
    case 'users':
      return hasPermission(userRole, 'canManageUsers');
    case 'tenants':
      return hasPermission(userRole, 'canManageTenants');
    case 'events':
      return hasPermission(userRole, 'canManageEvents');
    case 'tickets':
      return hasPermission(userRole, 'canManageTickets');
    case 'orders':
      return hasPermission(userRole, 'canManageOrders');
    case 'reports':
      return hasPermission(userRole, 'canViewReports');
    default:
      return false;
  }
};

export const validateTokenFormat = (token: string): boolean => {
  // JWT Token basic format validation
  const parts = token.split('.');
  return parts.length === 3;
}; 