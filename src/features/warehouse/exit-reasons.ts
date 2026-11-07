import type { ExitReason } from './api';

// Los motivos de una salida, como se leen en el formulario y en el historial del lote. Venta está
// para leer las salidas que genera una venta, pero nunca se elige a mano.
export const EXIT_REASON_LABELS: Record<ExitReason, string> = {
  shrinkage: 'Merma',
  sample: 'Muestra',
  reprocessing: 'Reproceso',
  transfer: 'Traslado',
  other: 'Otro (con detalle)',
  sale: 'Venta',
};

export type ManualExitReason = Exclude<ExitReason, 'sale'>;

export const MANUAL_EXIT_REASONS = [
  'shrinkage',
  'sample',
  'reprocessing',
  'transfer',
  'other',
] as const satisfies readonly ManualExitReason[];

// Las opciones del select de motivo, en el orden de la lista y sin Venta.
export const EXIT_REASON_OPTIONS = MANUAL_EXIT_REASONS.map((value) => ({
  value,
  label: EXIT_REASON_LABELS[value],
}));

export const DETAIL_MAX_LENGTH = 300;
export const DETAIL_REQUIRED_MESSAGE = 'Describa el motivo de la salida';

export const needsDetail = (reason: string) => reason === 'other';

// Con Otro el detalle es lo único que dice por qué sale el cacao; con los demás es opcional.
export const exitDetailIssue = (reason: string, detail: string) =>
  needsDetail(reason) && !detail.trim() ? DETAIL_REQUIRED_MESSAGE : null;

// El motivo como se lee en el historial: con Otro, lo que se escribió.
export function exitReasonText(reason: ExitReason, detail = '') {
  if (reason === 'other') return detail.trim() || 'Otro';
  return EXIT_REASON_LABELS[reason];
}
