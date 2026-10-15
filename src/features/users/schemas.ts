import { z } from 'zod';
import { DOCUMENT_TYPES } from '@/lib/document-types';
import { isEmail } from '@/lib/validation/is-email';
import { optionalPhoneSchema } from '@/lib/validation/phone';
import { isFieldPermission } from '@/lib/permissions';
import type { Role } from '@/lib/api/roles';
import type { Account, AccountCreate, AccountUpdate } from '@/lib/api/accounts';

// Datos personales: los comparten el alta y la edición.
export const accountDataSchema = z.object({
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
});
export const roleIdsSchema = z
  .array(z.string())
  .min(1, 'Selecciona al menos un rol.');
// Las fincas en las que trabaja un empleado; vacía es "sin finca".
const farmIdsSchema = z.array(z.string());
export const FARM_REQUIRED = 'Marca al menos una finca en la que trabaje.';
export const accountSchema = accountDataSchema.extend({
  role_ids: roleIdsSchema,
  farm_ids: farmIdsSchema,
});
export const accountEditSchema = accountDataSchema.extend({
  farm_ids: farmIdsSchema,
});
export type AccountDataValues = z.infer<typeof accountDataSchema>;
export type AccountValues = z.infer<typeof accountSchema>;
export type AccountEditValues = z.infer<typeof accountEditSchema>;
export const emptyAccount: AccountValues = {
  email: '',
  document_type: 'CC',
  identity_document: '',
  first_name: '',
  last_name: '',
  phone: '',
  role_ids: [],
  farm_ids: [],
};
export const toAccountRequest = (
  { farm_ids, ...values }: AccountValues,
  producer?: string,
): AccountCreate => ({
  ...values,
  email: values.email.toLowerCase(),
  phone: values.phone || null,
  ...(farm_ids.length ? { farm_ids } : {}),
  ...(producer ? { producer_id: producer } : {}),
});
// Un rol con algún permiso de campo solo sirve con una finca: sin ella no alcanza nada.
export const rolesNeedFarm = (
  roleIds: readonly string[],
  roles: Pick<Role, 'id' | 'permissions'>[],
) =>
  roles.some(
    (role) =>
      roleIds.includes(role.id) && role.permissions.some(isFieldPermission),
  );
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

export const toAccountDataValues = (account: Account): AccountDataValues => ({
  email: account.email,
  document_type: account.document_type,
  identity_document: account.identity_document,
  first_name: account.first_name,
  last_name: account.last_name,
  phone: account.phone ?? '',
});
export const toAccountEditValues = (account: Account): AccountEditValues => ({
  ...toAccountDataValues(account),
  farm_ids: account.farms.map((farm) => farm.id),
});
// En la cuenta Productor, documento y nombres los gobierna el expediente: no se envían. Las
// fincas solo viajan si quien edita las asigna y cambiaron (`withFarms`); vacías, las quitan.
export const toAccountUpdate = (
  { farm_ids, ...values }: AccountEditValues,
  identityLocked: boolean,
  withFarms = false,
): AccountUpdate => {
  const email = values.email.toLowerCase();
  const phone = values.phone || null;
  if (identityLocked) return { email, phone };
  return {
    ...values,
    email,
    phone,
    ...(withFarms ? { farm_ids } : {}),
  };
};
const hasRole = (account: Account, code: string) =>
  account.roles.some((role) => role.code === code);
export const isProducerAccount = (account: Account) =>
  hasRole(account, 'producer');
// Las cuentas Productor y Administrador no cambian de rol.
export const hasFixedRole = (account: Account) =>
  isProducerAccount(account) || hasRole(account, 'administrator');

// Si dos listas de fincas son las mismas, sin importar el orden en que se marcaron.
export const sameFarms = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));
