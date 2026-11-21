import type { components } from '@/lib/api/schema';

export type ExitReason = components['schemas']['StockExitReasonEnum'];

// Los motivos de una salida de bodega, como se leen en Bodega y en la historia del lote. Venta está
// para leer las salidas que genera una venta, pero nunca se elige a mano.
export const EXIT_REASON_LABELS: Record<ExitReason, string> = {
  shrinkage: 'Merma',
  sample: 'Muestra',
  reprocessing: 'Reproceso',
  transfer: 'Traslado fuera de la finca',
  other: 'Otro (con detalle)',
  sale: 'Venta',
};

// El motivo como se lee en un historial: con Otro, lo que se escribió.
export function exitReasonText(reason: ExitReason, detail = '') {
  if (reason === 'other') return detail.trim() || 'Otro';
  return EXIT_REASON_LABELS[reason];
}
