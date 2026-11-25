import type { AuditChange } from './api';

export const VISIBLE_CHANGES = 3;

// Los cambios que se ven de entrada y los que quedan plegados tras «Ver N cambios más», para que una
// fila con muchos campos no alargue la tabla. Con uno solo de más se muestra: el enlace ocuparía la
// misma línea que el cambio que esconde.
export function splitChanges(changes: AuditChange[], limit = VISIBLE_CHANGES) {
  if (changes.length <= limit + 1) return { shown: changes, rest: [] };
  return { shown: changes.slice(0, limit), rest: changes.slice(limit) };
}

export const moreChangesLabel = (count: number) =>
  count === 1 ? 'Ver 1 cambio más' : `Ver ${count} cambios más`;
