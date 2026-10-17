import type { components } from '@/lib/api/schema';
import { ACTIVITIES_PATH } from '@/lib/paths/activities';

type Activity = components['schemas']['AgriculturalActivity'];

// Cómo se ve cada tipo: el ícono y el color los pone la fila, el texto siempre va escrito.
export type NotificationLook =
  'upcoming' | 'delayed' | 'overdue' | 'control' | 'generic';

export type NotificationView = {
  look: NotificationLook;
  title: string;
  // La labor (o la plaga), la parcela y la finca.
  subject: string | null;
  // Cuándo es, cuánto lleva de retraso o lo que la actividad es ahora.
  detail: string | null;
  // La condición del aviso ya no se cumple: se ve atenuada y no pide atención.
  stale: boolean;
  href: string | null;
};

// Al calendario en el mes de la actividad, con su detalle abierto.
export const activityHref = (activity: Activity) =>
  `${ACTIVITIES_PATH}?${new URLSearchParams({
    mes: activity.scheduled_date.slice(0, 7),
    actividad: activity.id,
  })}`;

// La parcela y su finca: "P-03 · La Esperanza".
export const where = (activity: Activity) =>
  `${activity.plot.code} · ${activity.plot.farm.name}`;
