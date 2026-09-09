import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Geçerli bir e-posta adresi girin'),
  password: z.string().min(1, 'Şifre zorunludur'),
  remember: z.boolean(),
  tenantSlug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,64}$/, 'Küçük harf, rakam ve tire kullanın')
    .or(z.literal(''))
    .optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
