export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    PROFILE: '/auth/profile',
    VERIFY: '/auth/verify',
    REQUEST_RESET: '/auth/request-reset',
    RESET: '/auth/reset',
    RESEND_VERIFICATION: '/auth/resend-verification'
  },
  TICKETS: {
    LIST: '/tickets',
    MY_TICKETS: '/tickets/meine-tickets',
    CREATE: '/tickets/create',
    GET: '/tickets/:id',
    UPDATE: '/tickets/:id',
    DELETE: '/tickets/:id',
    COMMENTS: '/tickets/:id/comments'
  },
  EVENTS: {
    LIST: '/events',
    CREATE: '/events',
    GET: '/events/:id',
    UPDATE: '/events/:id',
    DELETE: '/events/:id'
  },
  ORDERS: {
    LIST: '/orders',
    CREATE: '/orders',
    GET: '/orders/:id',
    UPDATE: '/orders/:id',
    DELETE: '/orders/:id'
  },
  USERS: {
    LIST: '/users',
    CREATE: '/users',
    GET: '/users/:id',
    UPDATE: '/users/:id',
    DELETE: '/users/:id'
  },
  TENANTS: {
    LIST: '/tenants',
    CREATE: '/tenants',
    GET: '/tenants/:id',
    UPDATE: '/tenants/:id',
    DELETE: '/tenants/:id'
  },
  EMAIL: {
    CONTACT: '/email/contact',
    BOOKING: '/email/booking'
  }
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
} as const;

export const API_ERRORS = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
} as const; 