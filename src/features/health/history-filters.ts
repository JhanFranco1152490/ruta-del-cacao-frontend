import type { operations } from '@/lib/api/schema';

export type HistoryQuery = NonNullable<
  operations['phytosanitary_history_retrieve']['parameters']['query']
>;

// El valor del filtro de plaga para lo que se escribió en Otra; los demás son ids del catálogo.
export const OTHER_PEST_FILTER = 'otra';

export const PERIOD_INVERTED_MESSAGE =
  'La fecha inicial no puede ser posterior a la final';

export type HistoryFilters = {
  farm: string | null;
  plot: string | null;
  // Solo para la cuenta técnica, que ve el historial de todos los productores.
  producer: string | null;
  // Fechas sin hora (yyyy-MM-dd), incluidas.
  from: string | null;
  to: string | null;
  // Un id del catálogo u `OTHER_PEST_FILTER`.
  pest: string | null;
};

// Lo que se pide al servidor con los filtros de la URL y la página. Un periodo invertido no se
// pide: el servidor lo rechazaría, y se dice junto a los filtros.
export function historyQuery(
  filters: HistoryFilters,
  page = 1,
): { query: HistoryQuery } | { error: string } {
  const { farm, plot, producer, from, to, pest } = filters;
  if (from && to && from > to) return { error: PERIOD_INVERTED_MESSAGE };
  return {
    query: {
      ...(producer && { producer }),
      ...(farm && { farm }),
      ...(plot && { plot }),
      ...(from && { from }),
      ...(to && { to }),
      ...(pest === OTHER_PEST_FILTER
        ? { other: true }
        : pest && { pest_disease: pest }),
      ...(page > 1 && { page }),
    },
  };
}
