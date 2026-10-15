import { z } from 'zod';
import { DOCUMENT_TYPES } from '@/lib/document-types';
import { isEmail } from '@/lib/validation/is-email';
import { optionalPhoneSchema } from '@/lib/validation/phone';
import type { Role } from '@/lib/api/roles';
import {
  SCOPE_REQUIRED,
  sameFarms,
  scopeBody,
  type AccountScope,
} from '@/lib/farm-scope';
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
// El alcance de un empleado: las fincas en las que trabaja o todas. Sin ninguna de las dos no
// alcanza nada; que haga falta lo deciden los roles y se comprueba al enviar.
const farmIdsSchema = z.array(z.string());
export const FARM_REQUIRED = SCOPE_REQUIRED;
export const accountSchema = accountDataSchema.extend({
  role_ids: roleIdsSchema,
  farm_ids: farmIdsSchema,
  all_farms: z.boolean(),
});
export const accountEditSchema = accountDataSchema.extend({
  farm_ids: farmIdsSchema,
  all_farms: z.boolean(),
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
  all_farms: false,
};
// El alcance solo viaja en la cuenta de un empleado (`withScope`): las cuentas Productor y
// Administrador no llevan fincas y el servidor rechaza enviarlas.
export const toAccountRequest = (
  { farm_ids, all_farms, ...values }: AccountValues,
  producer?: string,
  withScope = false,
): AccountCreate => ({
  ...values,
  email: values.email.toLowerCase(),
  phone: values.phone || null,
  ...(withScope ? scopeBody({ farm_ids, all_farms }) : {}),
  ...(producer ? { producer_id: producer } : {}),
});
// Los roles elegidos, para saber qué alcance piden.
export const rolesById = (roleIds: readonly string[], roles: readonly Role[]) =>
  roles.filter((role) => roleIds.includes(role.id));
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
  all_farms: account.all_farms,
});
// El alcance que tiene la cuenta ahora, en la forma del formulario.
export const scopeOfAccount = (account: Account): AccountScope => ({
  all_farms: account.all_farms,
  farm_ids: account.farms.map((farm) => farm.id),
});
// En la cuenta Productor, documento y nombres los gobierna el expediente: no se envían. El alcance
// solo viaja si quien edita lo asigna y cambió (`withFarms`).
export const toAccountUpdate = (
  { farm_ids, all_farms, ...values }: AccountEditValues,
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
    ...(withFarms ? scopeBody({ farm_ids, all_farms }) : {}),
  };
};
const hasRole = (account: Account, code: string) =>
  account.roles.some((role) => role.code === code);
export const isProducerAccount = (account: Account) =>
  hasRole(account, 'producer');
// Las cuentas Productor y Administrador no cambian de rol.
export const hasFixedRole = (account: Account) =>
  isProducerAccount(account) || hasRole(account, 'administrator');

export { sameFarms };
