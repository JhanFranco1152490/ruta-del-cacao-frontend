'use client';

import {
  type inferParserType,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';

import { AUDIENCE_VIEWS, type AudienceView } from '@/lib/audience-view';
import { parseAsIsoDate } from '@/lib/navigation/iso-date-parser';
import {
  matchingPreset,
  type PeriodPreset,
  presetBounds,
} from '@/lib/period-presets';

import type { ReportFilterValues } from './report-request';

// Una vista o una fecha malformadas (?vista=todas, ?desde=zzz) cuentan como no puestas.
const parsers = {
  view: parseAsStringLiteral(AUDIENCE_VIEWS),
  type: parseAsString,
  from: parseAsIsoDate,
  to: parseAsIsoDate,
  producer: parseAsString,
  municipality: parseAsString,
  farm: parseAsString,
  plot: parseAsString,
  lot: parseAsString,
  generate: parseAsStringLiteral(['1'] as const),
};

// En la URL los parámetros van en español, como las rutas.
const urlKeys = {
  view: 'vista',
  type: 'tipo',
  from: 'desde',
  to: 'hasta',
  producer: 'productor',
  municipality: 'municipio',
  farm: 'finca',
  plot: 'parcela',
  lot: 'lote',
  generate: 'generar',
};

type Params = Partial<inferParserType<typeof parsers>>;

const PLACE_KEYS = ['producer', 'municipality', 'farm', 'plot', 'lot'] as const;

const NO_PLACE = Object.fromEntries(
  PLACE_KEYS.map((key) => [key, null]),
) as Record<(typeof PLACE_KEYS)[number], null>;

// El tipo, los filtros y si ya se generó viven en la URL: un enlace compartido con `generar=1`
// vuelve a generar el mismo reporte. Cualquier cambio de un filtro quita el reporte de la vista
// (quita `generar`), para que lo que se ve corresponda siempre a los filtros de arriba. El periodo
// abre en este año, que no se escribe.
export function useReportFilters() {
  const [params, setParams] = useQueryStates(parsers, {
    urlKeys,
    clearOnDefault: true,
  });
  const year = presetBounds('year');
  const from = params.from ?? year.from;
  const to = params.to ?? year.to;

  const change = (next: Params) => setParams({ ...next, generate: null });
  // Una fecha igual a la de siempre no se escribe en la URL.
  const dateParam = (value: string | null, fallback: string) =>
    !value || value === fallback ? null : value;

  const values: Omit<ReportFilterValues, 'type'> = {
    from,
    to,
    producer: params.producer || null,
    municipality: params.municipality || null,
    farm: params.farm || null,
    plot: params.plot || null,
    lot: params.lot || null,
  };

  return {
    requestedView: params.view,
    requestedType: params.type,
    values,
    preset: matchingPreset(from, to),
    generated: params.generate === '1',
    // Hay algo que limpiar: un lugar elegido o un periodo distinto de este año.
    hasFilters:
      !!(params.from || params.to) || PLACE_KEYS.some((key) => !!values[key]),
    // Cada vista tiene sus propios lugares: al cambiar de vista se conservan el tipo y el periodo.
    setView: (view: AudienceView) => change({ view, ...NO_PLACE }),
    setType: (type: string | null) => change({ type }),
    setFrom: (date: string | null) =>
      change({ from: dateParam(date, year.from) }),
    setTo: (date: string | null) => change({ to: dateParam(date, year.to) }),
    setPreset: (preset: PeriodPreset) => {
      const bounds = presetBounds(preset);
      return change({
        from: dateParam(bounds.from, year.from),
        to: dateParam(bounds.to, year.to),
      });
    },
    // Lo que se elige después depende de lo anterior: la finca es del productor, la parcela de la
    // finca y el lote de la parcela.
    setProducer: (producer: string | null) =>
      change({ producer, farm: null, plot: null, lot: null }),
    setMunicipality: (municipality: string | null) => change({ municipality }),
    setFarm: (farm: string | null) => change({ farm, plot: null, lot: null }),
    setPlot: (plot: string | null) => change({ plot, lot: null }),
    setLot: (lot: string | null) => change({ lot }),
    generate: () => setParams({ generate: '1' }),
    // Limpiar deja la vista y el tipo: es lo que se estaba armando.
    clear: () => change({ ...NO_PLACE, from: null, to: null }),
  };
}
