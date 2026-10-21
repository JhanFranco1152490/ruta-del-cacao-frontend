'use client';

import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';

import { parseAsIsoDate } from '@/lib/navigation/iso-date-parser';

import type { HistoryFilters } from './history-filters';

// Las dos pestañas de Sanidad: lo que hay por hacer y lo que ya se registró.
export const HEALTH_VIEWS = ['pendiente', 'historial'] as const;
export type HealthView = (typeof HEALTH_VIEWS)[number];

// La pestaña, los filtros y la página viven en la URL: se pueden compartir y el botón atrás los
// respeta. Una fecha mal escrita cae en "sin filtro".
const parsers = {
  view: parseAsStringLiteral(HEALTH_VIEWS),
  farm: parseAsString,
  plot: parseAsString,
  producer: parseAsString,
  from: parseAsIsoDate,
  to: parseAsIsoDate,
  pest: parseAsString,
  page: parseAsInteger,
};
// En la URL los parámetros van en español, como las rutas.
const urlKeys = {
  view: 'vista',
  farm: 'finca',
  plot: 'parcela',
  producer: 'productor',
  from: 'desde',
  to: 'hasta',
  pest: 'plaga',
  page: 'pagina',
};

export function useHistoryFilters() {
  const [params, setParams] = useQueryStates(parsers, { urlKeys });
  const filters: HistoryFilters = {
    farm: params.farm || null,
    plot: params.plot || null,
    producer: params.producer || null,
    from: params.from,
    to: params.to,
    pest: params.pest || null,
  };
  // Cambiar un filtro vuelve a la primera página: la que se veía puede ya no existir. Un valor
  // vacío sale de la URL en vez de quedar como `?desde=`.
  const change = (patch: Partial<typeof params>) =>
    setParams({ ...patch, page: null });
  return {
    filters,
    // Sin `vista` en la dirección, la pantalla decide con lo que haya por hacer.
    view: params.view,
    setView: (view: HealthView) => setParams({ view, page: null }),
    page: params.page && params.page > 0 ? params.page : 1,
    hasFilters: !!(
      filters.farm ||
      filters.plot ||
      filters.producer ||
      filters.from ||
      filters.to ||
      filters.pest
    ),
    // La parcela es de una finca y la finca de un productor: al cambiar la de arriba, lo de abajo
    // ya no corresponde.
    setProducer: (producer: string | null) =>
      change({ producer: producer || null, farm: null, plot: null }),
    setFarm: (farm: string | null) =>
      change({ farm: farm || null, plot: null }),
    setPlot: (plot: string | null) => change({ plot: plot || null }),
    setFrom: (from: string) => change({ from: from || null }),
    setTo: (to: string) => change({ to: to || null }),
    setPest: (pest: string | null) => change({ pest: pest || null }),
    setPage: (page: number) => setParams({ page: page > 1 ? page : null }),
    clear: () =>
      setParams({
        farm: null,
        plot: null,
        producer: null,
        from: null,
        to: null,
        pest: null,
        page: null,
      }),
  };
}
