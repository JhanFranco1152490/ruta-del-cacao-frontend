import { z } from 'zod';
import { DOCUMENT_TYPES } from '@/lib/document-types';
import { isEmail } from '@/lib/is-email';
import { optionalPhoneSchema } from '@/lib/form-schemas';
import type { Role } from '@/lib/api/roles';
import type { AccountCreate } from './api';

export const accountSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254)
    .refine(isEmail, 'Ingresa un correo electrónico válido.'),
  document_type: z.enum(DOCUMENT_TYPES),
  identity_document: z
    .string()
    .trim()
    .regex(/^[0-9]{1,15}$/, 'Ingresa solo números, máximo 15 dígitos.'),
  first_name: z.string().trim().min(1, 'Ingresa los nombres.').max(150),
  last_name: z.string().trim().min(1, 'Ingresa los apellidos.').max(150),
  phone: optionalPhoneSchema,
  role_ids: z.array(z.string()).min(1, 'Selecciona al menos un rol.'),
});
export type AccountValues = z.infer<typeof accountSchema>;
export const emptyAccount: AccountValues = {
  email: '',
  document_type: 'CC',
  identity_document: '',
  first_name: '',
  last_name: '',
  phone: '',
  role_ids: [],
};
export const toAccountRequest = (
  values: AccountValues,
  producer?: string,
): AccountCreate => ({
  ...values,
  email: values.email.toLowerCase(),
  phone: values.phone || null,
  ...(producer ? { producer_id: producer } : {}),
});
export function assignableRoles(
  roles: Role[],
  permissions: readonly string[],
  association: boolean,
  producer?: string,
) {
  if (association && !producer)
    return roles.filter((role) => role.code === 'administrator');
  return roles.filter(
    (role) =>
      role.kind !== 'fixed' &&
      (!role.producer_id || role.producer_id === producer) &&
      role.permissions.every((code) => permissions.includes(code)),
  );
}
