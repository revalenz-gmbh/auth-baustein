export interface Order {
  id: number;
  tenant_id?: number;
  event_id?: number;
  customer_name?: string;
  customer_email?: string;
  status: OrderStatus;
  reservation_until?: Date;
  created_at: Date;
  updated_at: Date;
  payment_method?: string;
  payment_status?: PaymentStatus;
  payment_reference?: string;
  metadata?: any;
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface CreateOrderData {
  tenant_id?: number;
  event_id?: number;
  customer_name?: string;
  customer_email?: string;
  payment_method?: string;
  metadata?: any;
}

export interface UpdateOrderData {
  customer_name?: string;
  customer_email?: string;
  status?: OrderStatus;
  payment_method?: string;
  payment_status?: PaymentStatus;
  payment_reference?: string;
  reservation_until?: Date;
  metadata?: any;
} 