export interface Event {
  id: number;
  tenant_id?: number;
  name: string;
  description?: string;
  event_date?: Date;
  location?: string;
  ticket_limit?: number;
  created_at: Date;
}

export interface CreateEventData {
  tenant_id?: number;
  name: string;
  description?: string;
  event_date?: Date;
  location?: string;
  ticket_limit?: number;
}

export interface UpdateEventData {
  name?: string;
  description?: string;
  event_date?: Date;
  location?: string;
  ticket_limit?: number;
} 