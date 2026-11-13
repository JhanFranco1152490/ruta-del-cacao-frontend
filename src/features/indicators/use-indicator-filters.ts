'use client';

import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';

import type { IndicatorFilters } from '@/lib/api/query-keys';

import {
  DEFAULT_INDICATOR_PERIOD,
  INDICATOR_PERIODS,
  indicatorPeriodBounds,
} from './indicator-period';

// El periodo, el panel, la finca y el productor viven en la URL: se comparten y el botón atrás los
// respeta. Un periodo malformado (?periodo=zzz) cae al de siempre, que no se escribe.
const parsers = {
  period: parseAsStringLiteral(INDICATOR_PERIODS).withDefault(
    DEFAULT_INDICATOR_PERIOD,
  ),
  view: parseAsString,
  farm: parseAsString,
  producer: parseAsString,
};

const urlKeys = {
  period: 'periodo',
  view: 'vista',
  farm: 'finca',
  producer: 'productor',
};

export function useIndicatorFilters() {
  const [params, setParams] = useQueryStates(parsers, {
    urlKeys,
    clearOnDefault: true,
  });
  const { from, to } = indicatorPeriodBounds(params.period);
  const filters: IndicatorFilters = {
    producer: params.producer || null,
    from,
    to,
    farm: params.farm || null,
  };
  return {
    filters,
    period: params.period,
    requestedView: params.view,
    setPeriod: (period: (typeof INDICATOR_PERIODS)[number]) =>
      setParams({ period }),
    // Cada panel tiene sus propios filtros: cambiar de panel deja la finca y el productor del otro.
    setView: (view: string) => setParams({ view, farm: null, producer: null }),
    setFarm: (farm: string | null) => setParams({ farm }),
    // La finca elegida era del productor anterior.
    setProducer: (producer: string | null) =>
      setParams({ producer, farm: null }),
    hasFarmFilter: !!params.farm,
    clearFarm: () => setParams({ farm: null }),
  };
}
