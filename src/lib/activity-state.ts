import type { components } from '@/lib/api/schema';
import { daysBetween } from '@/lib/format/dates';

type Schemas = components['schemas'];

export type ActivityState = Schemas['StateEnum'];

// Días que una actividad sin registrar se ve retrasada antes de quedar vencida. El servidor
// calcula el estado con la misma tolerancia: si cambia aquí, cambia allá.
export const OVERDUE_AFTER_DAYS = 3;

// Retrasada y vencida no se guardan: salen de la fecha programada y de la de hoy. Se calculan
// también en el dispositivo, porque la copia guardada puede ser de ayer y el estado que traía ya
// no valer. `today` es la fecha de Bogotá (yyyy-MM-dd).
export function activityState(
  activity: { status: Schemas['ActivityStatusEnum']; scheduled_date: string },
  today: string,
): { state: ActivityState; daysLate: number } {
  if (activity.status === 'done') return { state: 'done', daysLate: 0 };
  const daysLate = daysBetween(activity.scheduled_date, today);
  if (daysLate <= 0) return { state: 'scheduled', daysLate: 0 };
  return {
    state: daysLate < OVERDUE_AFTER_DAYS ? 'delayed' : 'overdue',
    daysLate,
  };
}
