'use client';

import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';

import type { HarvestFilters } from './harvest-filters';

// En la URL los parámetros van en español, como las rutas: `?lote=con` o `?lote=sin`.
const LOT_VALUES = ['con', 'sin'] as const;

// Un valor malformado en la URL (?lote=zzz) o vacío (?parcela=) cuenta como "sin filtro".
const parsers = {
  farm: parseAsString,
  plot: parseAsString,
  variety: parseAsString,
  collector: parseAsString,
  lot: parseAsStringLiteral(LOT_VALUES),
  producer: parseAsString,
};

const urlKeys = {
  farm: 'finca',
  plot: 'parcela',
  variety: 'variedad',
  collector: 'recolector',
  lot: 'lote',
  producer: 'productor',
};

// Los filtros de la lista de cosechas viven en la URL: se pueden compartir y el botón atrás los
// respeta. Se aplican en el dispositivo sobre el mes, así que valen igual sin conexión.
export function useHarvestFilters() {
  const [params, setParams] = useQueryStates(parsers, { urlKeys });

  const filters: HarvestFilters = {
    farm: params.farm || undefined,
    plot: params.plot || undefined,
    variety: params.variety || undefined,
    collector: params.collector || undefined,
    lot:
      params.lot === 'con'
        ? 'with'
        : params.lot === 'sin'
          ? 'without'
          : undefined,
  };
  const activeCount = Object.values(filters).filter(Boolean).length;

  return {
    filters,
    // De qué productor se trata; solo lo usa la cuenta técnica.
    producer: params.producer || null,
    activeCount,
    // La parcela elegida puede ser de otra finca: al cambiar la finca se vuelve a elegir.
    setFarm: (farm: string | null) => setParams({ farm, plot: null }),
    setPlot: (plot: string | null) => setParams({ plot }),
    setVariety: (variety: string | null) => setParams({ variety }),
    setCollector: (collector: string | null) => setParams({ collector }),
    setLot: (lot: 'with' | 'without' | null) =>
      setParams({
        lot: lot === 'with' ? 'con' : lot === 'without' ? 'sin' : null,
      }),
    // Lo elegido era del productor anterior: se vuelve a elegir.
    setProducer: (producer: string | null) =>
      setParams({
        producer,
        farm: null,
        plot: null,
        variety: null,
        collector: null,
      }),
    clear: () =>
      setParams({
        farm: null,
        plot: null,
        variety: null,
        collector: null,
        lot: null,
      }),
  };
}
