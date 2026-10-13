import { shiftDays } from '@/lib/format/dates';

import { type ActivityOfDay, effectiveState } from './activity-days';

// Cuántos días hacia adelante puede pedir la persona. Se lee siempre hasta el máximo y se recorta
// al mostrar: así cambiar el número no pide nada nuevo y la copia sin conexión sirve para todos.
export const PENDING_DAY_OPTIONS = [7, 14, 30, 60, 90] as const;
export const DEFAULT_PENDING_DAYS = 14;
export const PENDING_FETCH_DAYS =
  PENDING_DAY_OPTIONS[PENDING_DAY_OPTIONS.length - 1];

export const isPendingDays = (
  value: number,
): value is (typeof PENDING_DAY_OPTIONS)[number] =>
  (PENDING_DAY_OPTIONS as readonly number[]).includes(value);

export type PendingGroupKey = 'overdue' | 'delayed' | 'today' | 'upcoming';

export type PendingGroup = {
  key: PendingGroupKey;
  label: string;
  items: ActivityOfDay[];
};

const byDate = (a: ActivityOfDay, b: ActivityOfDay) =>
  a.activity.scheduled_date.localeCompare(b.activity.scheduled_date);

// Lo que sigue sin registrar, de lo más urgente a lo que viene: las vencidas (la más antigua
// primero), las retrasadas, las de hoy y las de los próximos `days` días. Una cuya realización
// espera en el dispositivo ya no está pendiente. Siempre devuelve los cuatro grupos, aunque estén
// vacíos.
export function groupPendingActivities(
  items: readonly ActivityOfDay[],
  today: string,
  days: number = DEFAULT_PENDING_DAYS,
): PendingGroup[] {
  const limit = shiftDays(today, days);
  const open = items.filter((item) => effectiveState(item) !== 'done');
  const pick = (keep: (item: ActivityOfDay) => boolean) =>
    open.filter(keep).sort(byDate);

  return [
    {
      key: 'overdue',
      label: 'Vencidas',
      items: pick((item) => item.state === 'overdue'),
    },
    {
      key: 'delayed',
      label: 'Retrasadas',
      items: pick((item) => item.state === 'delayed'),
    },
    {
      key: 'today',
      label: 'Hoy',
      items: pick(
        ({ activity, state }) =>
          state === 'scheduled' && activity.scheduled_date === today,
      ),
    },
    {
      key: 'upcoming',
      label: `Próximos ${days} días`,
      items: pick(
        ({ activity, state }) =>
          state === 'scheduled' &&
          activity.scheduled_date > today &&
          activity.scheduled_date <= limit,
      ),
    },
  ];
}
