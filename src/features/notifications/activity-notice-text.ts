import { activityState, OVERDUE_AFTER_DAYS } from '@/lib/activity-state';
import { activityTitle } from '@/lib/activity-types';
import type { components } from '@/lib/api/schema';
import { daysBetween, formatShortDate, shiftDays } from '@/lib/format/dates';

import { activityHref, type NotificationView, where } from './notice-parts';

type Schemas = components['schemas'];
type Notification = Schemas['Notification'];
type Activity = Schemas['AgriculturalActivity'];

const daysLateText = (days: number) =>
  `${days} ${days === 1 ? 'día' : 'días'} de retraso`;

// Los títulos sin el retraso, para cuando la actividad ya no lo tiene (se realizó o se movió).
const PLAIN_TITLES = {
  activity_upcoming: () => 'Actividad próxima a su fecha',
  activity_delayed: (own: boolean) =>
    own ? 'Tu actividad está retrasada' : 'Actividad retrasada',
  activity_overdue: (own: boolean) =>
    own ? 'Tu actividad está vencida' : 'Actividad vencida',
};

// Hasta cuándo se puede mover la fecha y desde cuándo está vencida, con la misma tolerancia que el
// estado de la actividad.
const lastRescheduleDay = (activity: Activity) =>
  formatShortDate(shiftDays(activity.scheduled_date, OVERDUE_AFTER_DAYS - 1));
const overdueSince = (activity: Activity) =>
  formatShortDate(shiftDays(activity.scheduled_date, OVERDUE_AFTER_DAYS));

// Lo que la actividad es ahora si ya no está en la condición del aviso: se realizó o se movió.
function changedSince(notification: Notification, activity: Activity) {
  if (activity.status === 'done') {
    return `Realizada el ${formatShortDate(activity.done_date ?? activity.scheduled_date)}`;
  }
  if (
    notification.condition_date &&
    notification.condition_date !== activity.scheduled_date
  ) {
    return `Reprogramada para el ${formatShortDate(activity.scheduled_date)}`;
  }
  return null;
}

function upcoming(activity: Activity, today: string) {
  const left = daysBetween(today, activity.scheduled_date);
  const date = formatShortDate(activity.scheduled_date);
  if (left < 0) return { detail: `Ya pasó su fecha, el ${date}`, stale: true };
  const when =
    left === 0 ? 'Es hoy' : left === 1 ? 'Es mañana' : `Faltan ${left} días`;
  return { detail: `${when} · ${date}`, stale: false };
}

function delayed(activity: Activity, daysLate: number, own: boolean) {
  if (daysLate >= OVERDUE_AFTER_DAYS) {
    return {
      title: PLAIN_TITLES.activity_delayed(own),
      detail: `Vencida desde el ${overdueSince(activity)}`,
      stale: true,
    };
  }
  const lastDay = daysLate === OVERDUE_AFTER_DAYS - 1;
  if (own) {
    return {
      title: `${lastDay ? 'Último día para reprogramar tu actividad' : PLAIN_TITLES.activity_delayed(own)} · ${daysLateText(daysLate)}`,
      detail: `Regístrala si ya la hiciste. ${lastDay ? 'Mañana queda vencida' : `Se puede reprogramar hasta el ${lastRescheduleDay(activity)}`}`,
      stale: false,
    };
  }
  return {
    title: `${PLAIN_TITLES.activity_delayed(own)} · ${daysLateText(daysLate)}`,
    detail: `Responsable: ${activity.assignee.full_name} · ${lastDay ? 'último día para reprogramarla' : `se puede reprogramar hasta el ${lastRescheduleDay(activity)}`}`,
    stale: false,
  };
}

function overdue(activity: Activity, daysLate: number, own: boolean) {
  const since = overdueSince(activity);
  return {
    title: `${PLAIN_TITLES.activity_overdue(own)} · ${daysLateText(daysLate)}`,
    detail: own
      ? `Vencida desde el ${since}`
      : `Responsable: ${activity.assignee.full_name} · vencida desde el ${since}`,
    stale: false,
  };
}

const LOOKS = {
  activity_upcoming: 'upcoming',
  activity_delayed: 'delayed',
  activity_overdue: 'overdue',
} as const;

type ActivityKind = keyof typeof LOOKS;
export const isActivityKind = (kind: string): kind is ActivityKind =>
  kind in LOOKS;

export function describeActivityNotice(
  notification: Notification,
  kind: ActivityKind,
  activity: Activity,
  { userId, today }: { userId: string | undefined; today: string },
): NotificationView {
  const own = !!userId && activity.assignee.id === userId;
  const base = {
    look: LOOKS[kind],
    subject: `${activityTitle(activity)} · ${where(activity)}`,
    href: activityHref(activity),
  };
  const changed = changedSince(notification, activity);
  if (changed) {
    return {
      ...base,
      title: PLAIN_TITLES[kind](own),
      detail: changed,
      stale: true,
    };
  }
  if (kind === 'activity_upcoming') {
    return {
      ...base,
      title: PLAIN_TITLES[kind](),
      ...upcoming(activity, today),
    };
  }
  const { daysLate } = activityState(activity, today);
  return {
    ...base,
    ...(kind === 'activity_delayed'
      ? delayed(activity, daysLate, own)
      : overdue(activity, daysLate, own)),
  };
}
