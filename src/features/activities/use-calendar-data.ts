'use client';

import { isNetworkFailure } from '@/lib/api/errors';
import { monthsBetween, shiftDays } from '@/lib/format/dates';
import { isPausedWithoutData } from '@/lib/offline/paused-read';

import { type ActivityOfDay, toActivityOfDay } from './activity-days';
import type { ActivityView } from './activity-view';
import { usePendingActivities } from './api';
import { useActivitiesOfRange } from './use-activities-of-range';
import { useQueuedCompletionStatuses } from './use-completion-queue';

export type CalendarScope = {
  userId: string | undefined;
  view: ActivityView;
  // El mes (yyyy-MM) y la semana (su lunes) que se ven.
  month: string;
  week: string;
  // Hoy, en la fecha de Bogotá.
  today: string;
  // Solo la cuenta técnica elige productor; las demás pasan `null`.
  producer: string | null;
  // Los recursos de la cola, además de la realización, que cierran una actividad mientras esperan
  // conexión (los entrega la página que une los dominios).
  closingResources?: readonly string[];
};

// Las actividades que pide la vista que está abierta, con el estado que tienen hoy: el mes en
// Mes, Lista y Por parcela; los meses que toca la semana (y solo sus siete días) en Semana, y lo
// que sigue sin registrar en Pendientes. Sin filtros: quien lo usa los aplica.
export function useCalendarData({
  userId,
  view,
  month,
  week,
  today,
  producer,
  closingResources,
}: CalendarScope) {
  const isPendingView = view === 'pendientes';
  const weekEnd = shiftDays(week, 6);
  const months = isPendingView
    ? []
    : view === 'semana'
      ? monthsBetween(week, weekEnd)
      : [month];
  const range = useActivitiesOfRange(userId, months, producer);
  const pending = usePendingActivities(userId, today, producer, {
    enabled: isPendingView,
  });
  const completions = useQueuedCompletionStatuses(userId, closingResources);

  const pendingNeverLoaded =
    isPausedWithoutData(pending) ||
    (pending.isError && isNetworkFailure(pending.error));
  const rangeNeverLoaded =
    months.length > 0 && range.unavailable.length === months.length;

  const activities = isPendingView
    ? (pending.data?.data ?? [])
    : view === 'semana'
      ? range.activities.filter(
          ({ scheduled_date }) =>
            scheduled_date >= week && scheduled_date <= weekEnd,
        )
      : range.activities;
  const neverLoaded = isPendingView ? pendingNeverLoaded : rangeNeverLoaded;

  return {
    items: activities.map((activity): ActivityOfDay =>
      toActivityOfDay(activity, today, completions),
    ),
    savedAt: isPendingView ? pending.data?.savedAt : range.savedAt,
    isPending: isPendingView
      ? pending.isPending && !pendingNeverLoaded
      : range.isPending,
    neverLoaded,
    // Meses de la vista que no se pudieron leer cuando otros sí: se muestra lo que hay y se avisa.
    missingMonths: isPendingView || neverLoaded ? [] : range.unavailable,
    error: isPendingView
      ? pending.isError && !pendingNeverLoaded
        ? pending.error
        : null
      : range.error,
    refetch: () => {
      if (isPendingView) void pending.refetch();
      else range.refetch();
    },
  };
}
