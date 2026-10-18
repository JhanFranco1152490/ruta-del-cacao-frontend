import type { components } from '@/lib/api/schema';

export type ActivityType = components['schemas']['ActivityTypeEnum'];

type Option<T extends string> = { value: T; label: string };

// En el orden en que se ofrecen en el formulario.
export const ACTIVITY_TYPE_OPTIONS = [
  { value: 'pruning', label: 'Poda' },
  { value: 'fertilization', label: 'Fertilización' },
  { value: 'irrigation', label: 'Riego' },
  { value: 'weed_control', label: 'Control de malezas' },
  { value: 'phytosanitary_monitoring', label: 'Monitoreo fitosanitario' },
  { value: 'phytosanitary_control', label: 'Control fitosanitario' },
  { value: 'cleaning_or_liming', label: 'Limpieza o encalado' },
  { value: 'inventory', label: 'Inventario' },
  { value: 'other', label: 'Otro' },
] as const satisfies readonly Option<ActivityType>[];

// Un tipo que esta versión de la app no conoce se muestra tal como llega, en vez de esconderlo.
export const activityTypeLabel = (type: string) =>
  ACTIVITY_TYPE_OPTIONS.find(({ value }) => value === type)?.label ?? type;

// Cómo se nombra la labor: una de tipo Otro se conoce por lo que la persona escribió.
export const activityTitle = (activity: {
  activity_type: string;
  other_description: string | null;
}) =>
  (activity.activity_type === 'other' && activity.other_description) ||
  activityTypeLabel(activity.activity_type);
