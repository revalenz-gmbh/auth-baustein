export interface User {
  id: number;
  tenant_id: number;
  email: string;
  password?: string; // Optional für Frontend-Verwendung
  name?: string;
  role: UserRole;
  status: UserStatus;
  created_at: Date;
  verificationToken?: string;
  resetToken?: string;
  resetTokenExpiry?: Date;
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'EXPERT' | 'CLIENT';
export type UserStatus = 'active' | 'inactive' | 'pending' | 'blocked';

export interface CreateUserData {
  tenant_id: number;
  email: string;
  password: string;
  name?: string;
  role: UserRole;
}

export interface UpdateUserData {
  email?: string;
  name?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UserProfile {
  id: number;
  email: string;
  name?: string;
  role: UserRole;
  status: UserStatus;
  created_at: Date;
} 