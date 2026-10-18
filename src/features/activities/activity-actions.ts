import { type ActingUser, mayRecordFor } from '@/lib/activity-recorders';
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
  // Un monitoreo sin registrar se cierra con su resultado, en su propia pantalla, y no con la
  // realización.
  recordMonitoring: boolean;
};

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
      recordMonitoring: false,
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
    recordMonitoring:
      type === 'phytosanitary_monitoring' && state !== 'done' && mayComplete,
  };
}

// Programar solo vale desde hoy: una fecha pasada la rechaza el formulario y el servidor. Decide si
// un día del calendario ofrece "programar aquí".
export const canScheduleOn = (date: string, today: string) => date >= today;
