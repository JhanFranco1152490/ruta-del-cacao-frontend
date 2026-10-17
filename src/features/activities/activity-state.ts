import type { ActivityState } from '@/lib/activity-state';
import type { ActivityType } from '@/lib/activity-types';

// El estado calculado de una actividad lo leen también otros dominios: vive en `lib/`.
export {
  type ActivityState,
  activityState,
  OVERDUE_AFTER_DAYS,
} from '@/lib/activity-state';
export type { ActivityType } from '@/lib/activity-types';

// Una vencida y una realizada son evidencia de lo que pasó: ni se editan ni se eliminan.
export const canEdit = (state: ActivityState) =>
  state === 'scheduled' || state === 'delayed';

export const canDelete = canEdit;

// Una vencida sí se registra: si la labor se hizo tarde, ese dato no se pierde. El monitoreo no
// usa este registro, porque su realización lleva un resultado que se captura en otra pantalla.
export const canComplete = (state: ActivityState, type: ActivityType) =>
  state !== 'done' && type !== 'phytosanitary_monitoring';
