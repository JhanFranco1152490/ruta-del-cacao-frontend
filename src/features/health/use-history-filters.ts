'use client';

import { parseAsString, useQueryStates } from 'nuqs';

import { parseAsIsoDate } from '@/lib/navigation/iso-date-parser';

import type { HistoryFilters } from './history-filters';

// Los filtros viven en la URL: se pueden compartir y el botón atrás los respeta. Una fecha mal
// escrita cae en "sin filtro".
const parsers = {
  from: parseAsIsoDate,
  to: parseAsIsoDate,
  pest: parseAsString,
};
// En la URL los parámetros van en español, como las rutas.
const urlKeys = { from: 'desde', to: 'hasta', pest: 'plaga' };

export function useHistoryFilters() {
  const [params, setParams] = useQueryStates(parsers, { urlKeys });
  const filters: HistoryFilters = {
    from: params.from,
    to: params.to,
    pest: params.pest || null,
  };
  return {
    filters,
    hasFilters: !!(filters.from || filters.to || filters.pest),
    // Un valor vacío sale de la URL en vez de quedar como `?desde=`.
    setFrom: (from: string) => setParams({ from: from || null }),
    setTo: (to: string) => setParams({ to: to || null }),
    setPest: (pest: string | null) => setParams({ pest: pest || null }),
    clear: () => setParams({ from: null, to: null, pest: null }),
  };
}
