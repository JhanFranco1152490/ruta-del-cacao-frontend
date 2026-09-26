import { z } from 'zod';

import type { components } from '@/lib/api/schema';
import { DOCUMENT_TYPES } from '@/lib/document-types';
import { isEmail } from '@/lib/is-email';

type LoginRequest = components['schemas']['LoginRequest'];

export const loginSchema = z
  .object({
    loginMethod: z.enum(['email', 'document']),
    documentType: z.enum(DOCUMENT_TYPES),
    identifier: z.string().trim(),
    password: z.string().min(1, 'Ingresa tu contraseña.'),
  })
  .superRefine((values, ctx) => {
    const problem = (message: string) =>
      ctx.addIssue({ code: 'custom', path: ['identifier'], message });

    if (values.loginMethod === 'email') {
      if (!values.identifier) problem('Ingresa tu correo electrónico.');
      else if (!isEmail(values.identifier))
        problem('Ingresa un correo electrónico válido.');
      return;
    }
    const digits = values.identifier.replace(/[.\s-]/g, '');
    if (!digits) problem('Ingresa tu número de documento.');
    else if (!/^[0-9]+$/.test(digits))
      problem('El número de documento debe contener solo dígitos.');
    else if (digits.length > 15)
      problem('El número de documento debe tener máximo 15 dígitos.');
  });

export type LoginFormValues = z.infer<typeof loginSchema>;

export function toLoginRequest(values: LoginFormValues): LoginRequest {
  if (values.loginMethod === 'email') {
    return {
      login_method: 'email',
      email: values.identifier.trim(),
      password: values.password,
    };
  }
  return {
    login_method: 'document',
    document_type: values.documentType,
    identity_document: values.identifier.trim(),
    password: values.password,
  };
}

export const resetRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Ingresa tu correo electrónico.')
    .refine(isEmail, 'Ingresa un correo electrónico válido.'),
});

export type ResetRequestValues = z.infer<typeof resetRequestSchema>;

export const passwordSchema = z
  .string()
  .min(1, 'Ingresa tu contraseña.')
  .refine(
    (value) => value === '' || (value.length >= 8 && value.length <= 50),
    {
      message: 'La contraseña debe tener entre 8 y 50 caracteres.',
    },
  )
  .refine((value) => !/^\d+$/.test(value), {
    message: 'La contraseña no puede contener solo números.',
  });

// Los campos se llaman como en el API para que sus errores de campo caigan en su sitio.
export const resetConfirmSchema = z
  .object({
    new_password: passwordSchema,
    new_password_confirmation: z.string(),
  })
  .refine(
    (values) => values.new_password === values.new_password_confirmation,
    {
      path: ['new_password_confirmation'],
      message: 'Las contraseñas no coinciden.',
    },
  );

export type ResetConfirmValues = z.infer<typeof resetConfirmSchema>;
