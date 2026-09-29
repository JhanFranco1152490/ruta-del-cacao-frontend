export const PERMISSIONS = {
  PRODUCERS_VIEW: 'producers.view',
  FARMS_VIEW: 'farms.view_farm',
  FARMS_ADD: 'farms.add_farm',
  FARMS_CHANGE: 'farms.change_farm',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Solo decide qué mostrar: el servidor autoriza cada acción. Acepta el usuario ausente porque
// la sesión puede no haber cargado todavía.
export function hasPermission(
  user: { permissions?: readonly string[] } | null | undefined,
  code: Permission,
): boolean {
  return user?.permissions?.includes(code) ?? false;
}
