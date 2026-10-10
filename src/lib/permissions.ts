export const PERMISSIONS = {
  PRODUCERS_VIEW: 'producers.view',
  PRODUCERS_DELETE: 'producers.delete',
  FARMS_VIEW: 'farms.view_farm',
  FARMS_ADD: 'farms.add_farm',
  FARMS_CHANGE: 'farms.change_farm',
  FARMS_DELETE: 'farms.delete_farm',
  PLOTS_VIEW: 'plots.view_plot',
  PLOTS_ADD: 'plots.add_plot',
  PLOTS_CHANGE: 'plots.change_plot',
  PLOTS_DELETE: 'plots.delete_plot',
  CROPS_CHARACTERIZE: 'crops.change_plotcharacterization',
  CROPS_MANAGE_VARIETIES: 'crops.manage_cacaovariety',
  INPUTS_VIEW: 'inputs.view_agriculturalinput',
  INPUTS_ADD: 'inputs.add_agriculturalinput',
  INPUTS_CHANGE: 'inputs.change_agriculturalinput',
  INPUTS_DELETE: 'inputs.delete_agriculturalinput',
  INPUTS_MANAGE_STOCK: 'inputs.manage_inputstock',
  USERS_VIEW: 'accounts.users_view',
  USERS_CREATE: 'accounts.users_create',
  USERS_UPDATE: 'accounts.users_update',
  USERS_CHANGE_STATUS: 'accounts.users_change_status',
  USERS_DELETE: 'accounts.users_delete',
  ROLES_VIEW: 'accounts.roles_view',
  ROLES_MANAGE: 'accounts.roles_manage',
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
