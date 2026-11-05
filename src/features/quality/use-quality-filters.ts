'use client';

import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';

import { usePaginatedSearch } from '@/hooks/use-paginated-search';
import type { QualityFilters } from '@/lib/api/query-keys';
import { QUALITY_ACTIONS } from '@/lib/paths/quality';

import type { QualityApiView } from './api';

export const QUALITY_VIEWS = ['por-evaluar', 'evaluados', 'cerrados'] as const;
export type QualityView = (typeof QUALITY_VIEWS)[number];

export const API_VIEW: Record<QualityView, QualityApiView> = {
  'por-evaluar': 'to_evaluate',
  evaluados: 'evaluated',
  cerrados: 'closed',
};

// Una pestaña o una acción malformadas (?vista=todas, ?accion=borrar) cuentan como la primera
// pestaña y como ninguna acción.
const parsers = {
  view: parseAsStringLiteral(QUALITY_VIEWS).withDefault('por-evaluar'),
  farm: parseAsString,
  search: parseAsString.withDefault(''),
  producer: parseAsString,
  page: parseAsInteger.withDefault(1),
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

  return {
    view: params.view,
    apiView: API_VIEW[params.view],
    filters,
    summaryFilters,
    hasFilters: !!filters.farm || !!filters.search,
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
    setPage: (page: number) => setParams({ page }),
    // La finca elegida era de otro productor.
    setProducer: (producer: string | null) =>
      setParams({ producer, farm: null, page: 1 }),
    clear: () => setParams({ farm: null, search: null, page: 1 }),
  };
}
