import { z } from 'zod';
import { isUuid } from '@/lib/is-uuid';
import type { PermissionItem, Role, RoleCreate } from './api';

export const roleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Escribe el nombre del rol.')
    .max(100, 'Usa máximo 100 caracteres.'),
  description: z.string().trim().max(255, 'Usa máximo 255 caracteres.'),
  permission_codes: z.array(z.string()),
});
export type RoleValues = z.infer<typeof roleSchema>;
export const roleDefaults = (role?: Role): RoleValues => ({
  name: role?.name ?? '',
  description: role?.description ?? '',
  permission_codes: role?.permissions ?? [],
});
export const toRoleRequest = (
  values: RoleValues,
  producer?: string,
): RoleCreate => ({
  ...values,
  ...(producer ? { producer_id: producer } : {}),
});
export const isRoleId = isUuid;
export const canEditRole = (role: Role, catalog: PermissionItem[]) =>
  role.kind === 'custom' &&
  role.permissions.every((code) =>
    catalog.some((p) => p.code === code && p.grantable && p.delegable),
  );
