import { z } from 'zod';

export const CreateTenantSchema = z.object({
  name: z.string().min(2, 'Tenant-Name muss mindestens 2 Zeichen lang sein'),
  email: z.string().email('Ungültige E-Mail-Adresse').optional(),
  domain: z.string().url('Ungültige Domain-URL').optional()
});

export const UpdateTenantSchema = z.object({
  name: z.string().min(2, 'Tenant-Name muss mindestens 2 Zeichen lang sein').optional(),
  email: z.string().email('Ungültige E-Mail-Adresse').optional(),
  domain: z.string().url('Ungültige Domain-URL').optional()
});

export type CreateTenantSchemaType = z.infer<typeof CreateTenantSchema>;
export type UpdateTenantSchemaType = z.infer<typeof UpdateTenantSchema>; 