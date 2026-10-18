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
  ACTIVITIES_VIEW: 'activities.view_agriculturalactivity',
  ACTIVITIES_ADD: 'activities.add_agriculturalactivity',
  ACTIVITIES_CHANGE: 'activities.change_agriculturalactivity',
  ACTIVITIES_COMPLETE: 'activities.complete_agriculturalactivity',
  ACTIVITIES_DELETE: 'activities.delete_agriculturalactivity',
  HARVESTS_VIEW: 'harvests.view_harvest',
  HARVESTS_ADD: 'harvests.add_harvest',
  HARVESTS_CHANGE: 'harvests.change_harvest',
  HARVESTS_DELETE: 'harvests.delete_harvest',
  LOTS_VIEW: 'lots.view_lot',
  LOTS_ADD: 'lots.add_lot',
  LOTS_DELETE: 'lots.delete_lot',
  HEALTH_MANAGE_PEST_DISEASE: 'health.manage_pestdisease',
  USERS_VIEW: 'accounts.users_view',
  USERS_CREATE: 'accounts.users_create',
  USERS_UPDATE: 'accounts.users_update',
  USERS_CHANGE_STATUS: 'accounts.users_change_status',
  USERS_DELETE: 'accounts.users_delete',
  ROLES_VIEW: 'accounts.roles_view',
  ROLES_MANAGE: 'accounts.roles_manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Las áreas de lo que cuelga de una finca. Un empleado con algún permiso de estas necesita una
// finca asignada: sin ella no alcanza nada. Los catálogos de variedades y de plagas y
// enfermedades son de la asociación.
const FIELD_AREAS = [
  'farms.',
  'plots.',
  'crops.',
  'inputs.',
  'activities.',
  'harvests.',
  'lots.',
];
export const isFieldPermission = (code: string) =>
  code !== PERMISSIONS.CROPS_MANAGE_VARIETIES &&
  FIELD_AREAS.some((area) => code.startsWith(area));

// Solo decide qué mostrar: el servidor autoriza cada acción. Acepta el usuario ausente porque
// la sesión puede no haber cargado todavía.
export function hasPermission(
  user: { permissions?: readonly string[] } | null | undefined,
  code: Permission,
): boolean {
  return user?.permissions?.includes(code) ?? false;
}
