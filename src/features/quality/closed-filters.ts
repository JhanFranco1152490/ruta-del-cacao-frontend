import type { QualityClosedFilters } from '@/lib/api/query-keys';
import { periodError } from '@/lib/period';

// Lo que se pregunta al servidor en la pestaña Cerrados, con el periodo solo si es válido: uno al
// revés se dice en el campo y la lista sigue como estaba.
export function effectiveClosedFilters(
  closed: QualityClosedFilters,
): QualityClosedFilters {
  if (!periodError(closed.from, closed.to)) return closed;
  return { ...closed, from: null, to: null };
}

export const hasClosedFilters = (closed: QualityClosedFilters) =>
  !!(closed.result || closed.from || closed.to);
