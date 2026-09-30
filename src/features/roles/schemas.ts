import { z } from 'zod';
import { isUuid } from '@/lib/validation/is-uuid';
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

// Un permiso puede depender de otro (`requires`, p. ej. administrar roles exige consultarlos).
// El servidor agrega el requerido al guardar; aquí se marca en el momento para que la persona
// vea lo que se va a guardar. Se sigue la cadena completa y solo se agregan permisos del
// catálogo, que son los que el formulario muestra.
export function withRequirements(
  codes: string[],
  catalog: PermissionItem[],
): string[] {
  const result = [...codes];
  for (let index = 0; index < result.length; index++) {
    const requires = catalog.find((p) => p.code === result[index])?.requires;
    if (
      requires &&
      !result.includes(requires) &&
      catalog.some((p) => p.code === requires)
    )
      result.push(requires);
  }
  return result;
}

// Los permisos marcados que necesitan `code`: mientras haya alguno, no se puede desmarcar.
export const requiredBy = (
  code: string,
  codes: string[],
  catalog: PermissionItem[],
) => catalog.filter((p) => p.requires === code && codes.includes(p.code));
