export interface Tenant {
  id: number;
  name: string;
  email?: string;
  domain?: string;
  created_at: Date;
}

export interface CreateTenantData {
  name: string;
  email?: string;
  domain?: string;
}

export interface UpdateTenantData {
  name?: string;
  email?: string;
  domain?: string;
} 