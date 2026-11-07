import type { QualityClosedFilters } from '@/lib/api/query-keys';

export const PERIOD_ERROR_MESSAGE =
  'La fecha final no puede ser anterior a la inicial.';

// Un periodo al revés no se pregunta al servidor: se dice en el campo y la lista sigue como estaba.
export const periodError = (from: string | null, to: string | null) =>
  from && to && from > to ? PERIOD_ERROR_MESSAGE : null;

// Lo que se pregunta al servidor en la pestaña Cerrados, con el periodo solo si es válido.
export function effectiveClosedFilters(
  closed: QualityClosedFilters,
): QualityClosedFilters {
  if (!periodError(closed.from, closed.to)) return closed;
  return { ...closed, from: null, to: null };
}

export const hasClosedFilters = (closed: QualityClosedFilters) =>
  !!(closed.result || closed.from || closed.to);
