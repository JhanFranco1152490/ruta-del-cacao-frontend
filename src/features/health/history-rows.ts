import type { components } from '@/lib/api/schema';

import type { Detection } from './detection-status';

type AgriculturalActivity = components['schemas']['AgriculturalActivity'];

export type HistoryRow = {
  key: string;
  activity: AgriculturalActivity;
  date: string;
  // `null`: el monitoreo no encontró nada.
  detection: Detection | null;
  // La primera fila de su monitoreo: la que lleva el botón del detalle.
  first: boolean;
};

// El historial en filas: una por cada detección de un monitoreo, o una sola «sin presencia» si no
// encontró nada. Las detecciones de un monitoreo llegan de la incidencia más alta a la más baja.
export function historyRows(
  activities: readonly AgriculturalActivity[],
): HistoryRow[] {
  return activities.flatMap((activity): HistoryRow[] => {
    const { monitoring } = activity;
    if (!monitoring) return [];
    const date = activity.done_date ?? activity.scheduled_date;
    const detections = monitoring.no_presence ? [] : monitoring.detections;
    if (detections.length === 0) {
      return [
        { key: activity.id, activity, date, detection: null, first: true },
      ];
    }
    return detections.map((detection, index) => ({
      key: detection.id,
      activity,
      date,
      detection,
      first: index === 0,
    }));
  });
}
