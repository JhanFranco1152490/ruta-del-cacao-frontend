import type { ActivityType } from './activity-state';
import type { AgriculturalActivity } from './api';
import {
  type ActivityFormInput,
  EMPTY_ACTIVITY_FORM,
  toFormValues,
} from './schemas';

// Lo que ya se sabe de dónde se programa: la finca y la parcela (desde una parcela), la fecha
// (desde un día del calendario) o el tipo (desde Sanidad, un monitoreo).
export type ActivityPreset = {
  farmId?: string;
  plotId?: string;
  date?: string;
  activityType?: ActivityType;
};

// Con qué empieza el formulario: lo de la actividad que se edita, o lo que trae `preset`.
export const activityFormDefaults = (
  activity: AgriculturalActivity | undefined,
  preset: ActivityPreset | undefined,
): ActivityFormInput =>
  activity
    ? toFormValues(activity)
    : {
        ...EMPTY_ACTIVITY_FORM,
        farm_id: preset?.farmId ?? '',
        plot_id: preset?.plotId ?? '',
        activity_type: preset?.activityType ?? '',
        scheduled_date: preset?.date ?? '',
      };

const TEXTS = {
  edit: {
    title: 'Editar actividad',
    description:
      'Puedes cambiar el tipo, la fecha o el responsable. La parcela no cambia.',
    submitLabel: 'Guardar cambios',
  },
  monitoring: {
    title: 'Programar monitoreo',
    description:
      'Se revisa la parcela en busca de plagas y enfermedades. Queda en el calendario, a nombre de su responsable.',
    submitLabel: 'Guardar',
  },
  schedule: {
    title: 'Programar actividad',
    description:
      'Queda en el calendario como programada, a nombre de su responsable.',
    submitLabel: 'Guardar',
  },
} as const;

// Título, explicación y botón del diálogo: editar, programar un monitoreo o programar una labor.
export const activityFormTexts = (editing: boolean, monitoring: boolean) =>
  TEXTS[editing ? 'edit' : monitoring ? 'monitoring' : 'schedule'];
