export const USER_ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  EXPERT: 'EXPERT',
  CLIENT: 'CLIENT'
} as const;

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  BLOCKED: 'blocked'
} as const;

export const TICKET_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  USED: 'USED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED'
} as const;

export const ORDER_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED'
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED'
} as const;

// Berechtigungen basierend auf Rollen
export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: {
    canManageUsers: true,
    canManageTenants: true,
    canManageEvents: true,
    canManageTickets: true,
    canManageOrders: true,
    canViewReports: true
  },
  [USER_ROLES.MANAGER]: {
    canManageUsers: true,
    canManageTenants: false,
    canManageEvents: true,
    canManageTickets: true,
    canManageOrders: true,
    canViewReports: true
  },
  [USER_ROLES.EXPERT]: {
    canManageUsers: false,
    canManageTenants: false,
    canManageEvents: false,
    canManageTickets: true,
    canManageOrders: false,
    canViewReports: false
  },
  [USER_ROLES.CLIENT]: {
    canManageUsers: false,
    canManageTenants: false,
    canManageEvents: false,
    canManageTickets: false,
    canManageOrders: false,
    canViewReports: false
  }
} as const; 