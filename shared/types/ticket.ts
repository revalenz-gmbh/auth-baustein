export interface Ticket {
  id: number;
  event_id?: number;
  order_id?: number;
  ticket_code: string;
  type?: string;
  owner_name?: string;
  owner_email?: string;
  quantity?: number;
  status: TicketStatus;
  created_at: Date;
  updated_at: Date;
  metadata?: any;
}

export type TicketStatus = 'PENDING' | 'ACTIVE' | 'USED' | 'CANCELLED' | 'EXPIRED';

export interface CreateTicketData {
  event_id?: number;
  order_id?: number;
  ticket_code: string;
  type?: string;
  owner_name?: string;
  owner_email?: string;
  quantity?: number;
  metadata?: any;
}

export interface UpdateTicketData {
  type?: string;
  owner_name?: string;
  owner_email?: string;
  quantity?: number;
  status?: TicketStatus;
  metadata?: any;
} 