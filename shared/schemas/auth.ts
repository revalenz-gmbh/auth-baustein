import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen lang sein'),
  type: z.enum(['customer', 'internal']).optional()
});

export const RegisterSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein'),
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen lang sein'),
  organization: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'EXPERT', 'CLIENT']),
  tenant_id: z.number().positive('Tenant ID ist erforderlich')
});

export const RequestResetSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse')
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset-Token ist erforderlich'),
  password: z.string().min(8, 'Neues Passwort muss mindestens 8 Zeichen lang sein'),
  confirmPassword: z.string().min(8, 'Passwort-Bestätigung ist erforderlich')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwörter stimmen nicht überein',
  path: ['confirmPassword']
});

export const VerifyEmailSchema = z.object({
  token: z.string().min(1, 'Verifizierungstoken ist erforderlich')
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen lang sein').optional(),
  email: z.string().email('Ungültige E-Mail-Adresse').optional()
});

export type LoginData = z.infer<typeof LoginSchema>;
export type RegisterData = z.infer<typeof RegisterSchema>;
export type RequestResetData = z.infer<typeof RequestResetSchema>;
export type ResetPasswordData = z.infer<typeof ResetPasswordSchema>;
export type VerifyEmailData = z.infer<typeof VerifyEmailSchema>;
export type UpdateProfileData = z.infer<typeof UpdateProfileSchema>; 