import { z } from 'zod';

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export const passwordSchema = z
  .string()
  .min(10, 'Şifre en az 10 karakter olmalı')
  .max(128)
  .regex(PASSWORD_RULE, 'Şifre harf ve rakam içermeli');

export const userSchema = z.object({
  firstName: z.string().trim().min(1, 'Ad zorunludur').max(100),
  lastName: z.string().trim().min(1, 'Soyad zorunludur').max(100),
  email: z.email('Geçerli bir e-posta girin').max(254),
  status: z.enum(['ACTIVE', 'INVITED', 'SUSPENDED', 'DISABLED']),
});
export type UserFormValues = z.infer<typeof userSchema>;

export const newUserSchema = userSchema.omit({ status: true }).extend({
  password: passwordSchema,
  roleIds: z.array(z.string()),
});
export type NewUserFormValues = z.infer<typeof newUserSchema>;

export const setPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: 'Şifreler eşleşmiyor', path: ['confirm'] });
export type SetPasswordFormValues = z.infer<typeof setPasswordSchema>;

export const roleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Rol adı en az 2 karakter olmalı')
    .max(64)
    .regex(/^[a-z0-9_]+$/, 'Küçük harf, rakam ve alt çizgi kullanın (örn. ik_uzmani)'),
  description: z.string().trim().max(255),
});
export type RoleFormValues = z.infer<typeof roleSchema>;
