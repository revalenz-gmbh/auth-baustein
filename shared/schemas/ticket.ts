import { z } from 'zod';

export const CreateTicketSchema = z.object({
  event_id: z.number().positive().optional(),
  order_id: z.number().positive().optional(),
  ticket_code: z.string().min(1, 'Ticket-Code ist erforderlich'),
  type: z.string().optional(),
  owner_name: z.string().min(2, 'Besitzername muss mindestens 2 Zeichen lang sein').optional(),
  owner_email: z.string().email('Ungültige E-Mail-Adresse').optional(),
  quantity: z.number().positive('Anzahl muss positiv sein').optional(),
  metadata: z.any().optional()
});

export const UpdateTicketSchema = z.object({
  type: z.string().optional(),
  owner_name: z.string().min(2, 'Besitzername muss mindestens 2 Zeichen lang sein').optional(),
  owner_email: z.string().email('Ungültige E-Mail-Adresse').optional(),
  quantity: z.number().positive('Anzahl muss positiv sein').optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'USED', 'CANCELLED', 'EXPIRED']).optional(),
  metadata: z.any().optional()
});

export type CreateTicketSchemaType = z.infer<typeof CreateTicketSchema>;
export type UpdateTicketSchemaType = z.infer<typeof UpdateTicketSchema>; 