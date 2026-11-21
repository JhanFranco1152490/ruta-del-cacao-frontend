import type { LotQuery } from './api';

export type LotEmptyState =
  // Todavía no hay ningún lote: se ofrece conformar uno.
  | { kind: 'none'; title: string }
  // Los filtros no dejan nada: se ofrece quitarlos.
  | { kind: 'filtered'; title: string };

// Qué dice la lista cuando no hay lotes. Con solo la finca o la parcela elegidas, que ese origen
// no tiene lotes (no que la búsqueda no encontró nada): es la pregunta de quien mira los lotes de
// una finca. Con cualquier otro filtro puesto, el vacío de siempre de una búsqueda. El productor
// de la cuenta técnica no cuenta: es de quién se mira, no un filtro de la lista.
export function lotEmptyState(query: LotQuery): LotEmptyState {
  const { farm, plot, search, status, variety, from, to } = query;
  if (search || status || variety || from || to) {
    return { kind: 'filtered', title: 'No se encontraron lotes' };
  }
  if (plot) {
    return {
      kind: 'filtered',
      title: 'No hay lotes asociados a esta parcela.',
    };
  }
  if (farm) {
    return { kind: 'filtered', title: 'No hay lotes asociados a esta finca.' };
  }
  return { kind: 'none', title: 'Aún no hay lotes' };
}
