import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import {
  type ActivityState,
  type ActivityType,
  canComplete,
  canDelete,
  canEdit,
} from './activity-state';

export type ActivityActions = {
  edit: boolean;
  complete: boolean;
  remove: boolean;
  // Un monitoreo sin registrar: quien podría registrarlo ve por qué no tiene el botón.
  awaitsHealthModule: boolean;
};

type ActingUser = {
  id?: string;
  permissions?: readonly string[];
  all_farms?: boolean;
};

// Registra la realización el responsable, quien programa labores (el Capataz/Operario o un rol
// propio con ese permiso) o quien alcanza todas las fincas (el Productor y la cuenta técnica):
// quien solo registra lo suyo no cierra la labor de un compañero.
export const mayRecordFor = (
  user: ActingUser | null | undefined,
  assigneeId: string | undefined,
) =>
  !!user &&
  (user.all_farms === true ||
    (!!assigneeId && user.id === assigneeId) ||
    hasPermission(user, PERMISSIONS.ACTIVITIES_ADD));

// Lo que esta persona puede hacer con una actividad: lo que permite su estado y, de eso, lo que
// permiten sus permisos. Solo decide qué mostrar; el servidor autoriza cada acción.
export function activityActions(
  state: ActivityState,
  type: ActivityType,
  user: ActingUser | null | undefined,
  assigneeId?: string,
  // La realización ya está guardada en el dispositivo y espera conexión: la labor se hizo.
  awaitingSync = false,
): ActivityActions {
  if (awaitingSync) {
    return {
      edit: false,
      complete: false,
      remove: false,
      awaitsHealthModule: false,
    };
  }
  const mayComplete =
    hasPermission(user, PERMISSIONS.ACTIVITIES_COMPLETE) &&
    mayRecordFor(user, assigneeId);
  return {
    edit: canEdit(state) && hasPermission(user, PERMISSIONS.ACTIVITIES_CHANGE),
    complete: canComplete(state, type) && mayComplete,
    remove:
      canDelete(state) && hasPermission(user, PERMISSIONS.ACTIVITIES_DELETE),
    awaitsHealthModule:
      type === 'phytosanitary_monitoring' && state !== 'done' && mayComplete,
  };
}

// Programar solo vale desde hoy: una fecha pasada la rechaza el formulario y el servidor. Decide si
// un día del calendario ofrece "programar aquí".
export const canScheduleOn = (date: string, today: string) => date >= today;
