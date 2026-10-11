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

// Lo que esta persona puede hacer con una actividad: lo que permite su estado y, de eso, lo que
// permiten sus permisos. Solo decide qué mostrar; el servidor autoriza cada acción.
export function activityActions(
  state: ActivityState,
  type: ActivityType,
  user: { permissions?: readonly string[] } | null | undefined,
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
  const mayComplete = hasPermission(user, PERMISSIONS.ACTIVITIES_COMPLETE);
  return {
    edit: canEdit(state) && hasPermission(user, PERMISSIONS.ACTIVITIES_CHANGE),
    complete: canComplete(state, type) && mayComplete,
    remove:
      canDelete(state) && hasPermission(user, PERMISSIONS.ACTIVITIES_DELETE),
    awaitsHealthModule:
      type === 'phytosanitary_monitoring' && state !== 'done' && mayComplete,
  };
}
