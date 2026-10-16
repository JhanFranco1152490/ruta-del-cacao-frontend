import type { components } from '@/lib/api/schema';
import { formatDayMonth, formatShortDayMonth } from '@/lib/format/dates';

import { controlMethodLabel } from './monitoring-rules';

type Schemas = components['schemas'];
export type Detection = Schemas['DetectionOutput'];
export type DetectionControlRow = Schemas['DetectionControlRow'];

// Cómo se nombra una detección: la plaga del catálogo, o lo que se escribió en Otra.
export const detectionName = (detection: Detection) =>
  detection.pest_disease?.name ?? `Otra (${detection.other_description})`;

export type DetectionStatus = {
  // `none`: nadie pidió nada; `requested`: alguien pidió que se lo programen; `dismissed`: quien
  // programa decidió que no hace falta.
  kind: 'none' | 'requested' | 'dismissed';
  text: string;
};

// Lo que se dice de una detección que no tiene ningún control; `null` si ya tiene uno.
export function detectionStatus(detection: Detection): DetectionStatus | null {
  if (detection.controls.length > 0) return null;
  const request = detection.control_request;
  if (!request) return { kind: 'none', text: 'Sin control' };
  if (request.dismissed_at) {
    const who = request.dismissed_by?.full_name;
    const when = formatShortDayMonth(request.dismissed_at);
    return {
      kind: 'dismissed',
      text: who
        ? `No requiere control · ${who}, ${when}`
        : `No requiere control · ${when}`,
    };
  }
  const who = request.requested_by?.full_name;
  const when = formatShortDayMonth(request.requested_at);
  return {
    kind: 'requested',
    text: who
      ? `Control solicitado por ${who} · ${when}`
      : `Control solicitado · ${when}`,
  };
}

const CONTROL_STATE_LABELS: Record<string, string> = {
  scheduled: 'Programado',
  delayed: 'Retrasado',
  overdue: 'Vencido',
  done: 'Realizado',
};

// Un control de la detección en una línea: qué, cuándo y cómo va.
export function controlRowText(control: DetectionControlRow) {
  const what =
    control.method === 'other'
      ? (control.method_description ?? 'Otro')
      : control.method
        ? controlMethodLabel(control.method)
        : 'Por decidir qué se hace';
  const date = formatDayMonth(control.done_date ?? control.scheduled_date);
  const state = CONTROL_STATE_LABELS[control.state] ?? control.state;
  return `${what} · ${date} · ${state}`;
}
