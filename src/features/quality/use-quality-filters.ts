'use client';

import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';

import { usePaginatedSearch } from '@/hooks/use-paginated-search';
import { parseAsIsoDate } from '@/lib/navigation/iso-date-parser';
import type {
  QualityClosedFilters,
  QualityFilters,
} from '@/lib/api/query-keys';
import { QUALITY_ACTIONS } from '@/lib/paths/quality';

import { NO_CLOSED_FILTERS, type QualityApiView } from './api';
import {
  effectiveClosedFilters,
  hasClosedFilters,
  periodError,
} from './closed-filters';

export const QUALITY_VIEWS = ['por-evaluar', 'evaluados', 'cerrados'] as const;
export type QualityView = (typeof QUALITY_VIEWS)[number];

export const API_VIEW: Record<QualityView, QualityApiView> = {
  'por-evaluar': 'to_evaluate',
  evaluados: 'evaluated',
  cerrados: 'closed',
};

export const CLOSED_RESULTS = ['clasificados', 'descartados'] as const;
export type ClosedResultParam = (typeof CLOSED_RESULTS)[number];

const API_RESULT: Record<ClosedResultParam, 'classified' | 'discarded'> = {
  clasificados: 'classified',
  descartados: 'discarded',
};

// Una pestaña o una acción malformadas (?vista=todas, ?accion=borrar) cuentan como la primera
// pestaña y como ninguna acción.
const parsers = {
  view: parseAsStringLiteral(QUALITY_VIEWS).withDefault('por-evaluar'),
  farm: parseAsString,
  search: parseAsString.withDefault(''),
  producer: parseAsString,
  page: parseAsInteger.withDefault(1),
  // Solo de la pestaña Cerrados: el resultado y el periodo de cierre.
  result: parseAsStringLiteral(CLOSED_RESULTS),
  from: parseAsIsoDate,
  to: parseAsIsoDate,
  // Los enlaces desde Lotes y la ficha: el lote y el formulario que se abre al llegar.
  lot: parseAsString,
  action: parseAsStringLiteral(QUALITY_ACTIONS),
};

// En la URL los parámetros van en español, como las rutas.
const urlKeys = {
  view: 'vista',
  farm: 'finca',
  search: 'buscar',
  producer: 'productor',
  page: 'pagina',
  result: 'resultado',
  from: 'desde',
  to: 'hasta',
  lot: 'lote',
  action: 'accion',
};

export function useQualityFilters() {
  const [params, setParams] = useQueryStates(parsers, {
    urlKeys,
    clearOnDefault: true,
  });
  const search = usePaginatedSearch(params.search, setParams);
  const summaryFilters: Omit<QualityFilters, 'page'> = {
    // Vacíos en la URL son «todas las fincas» y «sin elegir».
    producer: params.producer || null,
    farm: params.farm || null,
    search: params.search.trim(),
  };
  const filters: QualityFilters = {
    ...summaryFilters,
    page: Math.max(1, params.page),
  };

  const onClosedTab = params.view === 'cerrados';
  // Lo de Cerrados no sale a las otras pestañas: sus listas y su copia no cambian por ello.
  const closedInputs: QualityClosedFilters = {
    result: params.result ? API_RESULT[params.result] : null,
    from: params.from,
    to: params.to,
  };
  const closed = onClosedTab
    ? effectiveClosedFilters(closedInputs)
    : NO_CLOSED_FILTERS;

  return {
    view: params.view,
    apiView: API_VIEW[params.view],
    filters,
    summaryFilters,
    // Lo que se escribió en los campos de Cerrados, aunque el periodo esté al revés.
    closedInputs,
    closed,
    periodError: onClosedTab ? periodError(params.from, params.to) : null,
    hasFilters:
      !!filters.farm ||
      !!filters.search ||
      (onClosedTab && hasClosedFilters(closedInputs)),
    ...search,
    // Solo con las dos: un lote sin acción no abre nada.
    pendingAction:
      params.lot && params.action
        ? { lotId: params.lot, action: params.action }
        : null,
    clearAction: () => setParams({ lot: null, action: null }),
    // Cambiar de pestaña conserva la finca y la búsqueda: se mira lo mismo en la otra lista.
    setView: (view: QualityView) => setParams({ view, page: 1 }),
    setFarm: (farm: string | null) => setParams({ farm, page: 1 }),
    setResult: (result: ClosedResultParam | null) =>
      setParams({ result, page: 1 }),
    setFrom: (from: string | null) =>
      setParams({ from: from || null, page: 1 }),
    setTo: (to: string | null) => setParams({ to: to || null, page: 1 }),
    setPage: (page: number) => setParams({ page }),
    // La finca elegida era de otro productor.
    setProducer: (producer: string | null) =>
      setParams({ producer, farm: null, page: 1 }),
    clear: () =>
      setParams({
        farm: null,
        search: null,
        result: null,
        from: null,
        to: null,
        page: 1,
      }),
  };
}
