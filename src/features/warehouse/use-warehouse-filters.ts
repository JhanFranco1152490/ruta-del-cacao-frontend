'use client';

import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';
import { useCallback } from 'react';

import { usePaginatedSearch } from '@/hooks/use-paginated-search';
import type {
  PendingEntryFilters,
  StockFilters,
  WarehouseFilters,
} from '@/lib/api/query-keys';
import { WAREHOUSE_ACTIONS, WAREHOUSE_VIEWS } from '@/lib/paths/warehouse';

import type { Grade } from './api';
import type { StockSummaryFilters } from './queries';
import {
  resolveWarehouseView,
  type WarehousePermissions,
} from './warehouse-actions';

const STOCK_ORDER_FIELDS = [
  'lot',
  'grade',
  'quantity',
  'location',
  'entry_date',
] as const;
export type StockOrderField = (typeof STOCK_ORDER_FIELDS)[number];

// El orden de la API: el campo, o con `-` delante para descendente.
export const STOCK_ORDERINGS = STOCK_ORDER_FIELDS.flatMap((field) => [
  field,
  `-${field}` as const,
]);
export type StockOrdering = (typeof STOCK_ORDERINGS)[number];

const GRADES = ['g1', 'g2'] as const satisfies readonly Grade[];

// Una pestaña, un calibre, un orden o una acción malformados (?vista=todas, ?calibre=g3) cuentan
// como la pestaña por defecto y como ningún filtro.
const parsers = {
  view: parseAsStringLiteral(WAREHOUSE_VIEWS),
  farm: parseAsString,
  warehouse: parseAsString,
  grade: parseAsStringLiteral(GRADES),
  location: parseAsString.withDefault(''),
  search: parseAsString.withDefault(''),
  ordering: parseAsStringLiteral(STOCK_ORDERINGS),
  producer: parseAsString,
  page: parseAsInteger.withDefault(1),
  // Los enlaces desde Lotes: el lote y el formulario que se abre al llegar.
  lot: parseAsString,
  action: parseAsStringLiteral(WAREHOUSE_ACTIONS),
};

// En la URL los parámetros van en español, como las rutas.
const urlKeys = {
  view: 'vista',
  farm: 'finca',
  warehouse: 'bodega',
  grade: 'calibre',
  location: 'ubicacion',
  search: 'buscar',
  ordering: 'orden',
  producer: 'productor',
  page: 'pagina',
  lot: 'lote',
  action: 'accion',
};

export function useWarehouseFilters(can: WarehousePermissions) {
  const [params, setParams] = useQueryStates(parsers, {
    urlKeys,
    clearOnDefault: true,
  });
  const search = usePaginatedSearch(params.search, setParams);
  // La ubicación se escribe como la búsqueda: se espera a que se deje de teclear.
  const setLocationParams = useCallback(
    ({ search: value, page }: { search: string | null; page: number }) =>
      setParams({ location: value, page }),
    [setParams],
  );
  const location = usePaginatedSearch(params.location, setLocationParams);
  const page = Math.max(1, params.page);
  // Vacíos en la URL son «todas» y «sin elegir».
  const producer = params.producer || null;
  const farm = params.farm || null;
  const summaryFilters: StockSummaryFilters = {
    producer,
    farm,
    warehouse: params.warehouse || null,
    grade: params.grade,
    location: params.location.trim(),
    search: params.search.trim(),
  };
  const stockFilters: StockFilters = {
    ...summaryFilters,
    ordering: params.ordering,
    page,
  };
  const pendingFilters: PendingEntryFilters = {
    producer,
    farm,
    search: summaryFilters.search,
    page,
  };
  const warehouseFilters: WarehouseFilters = {
    producer,
    farm,
    active: null,
    page,
  };

  return {
    view: resolveWarehouseView(params.view, can),
    stockFilters,
    summaryFilters,
    pendingFilters,
    warehouseFilters,
    hasFilters:
      !!summaryFilters.farm ||
      !!summaryFilters.warehouse ||
      !!summaryFilters.grade ||
      !!summaryFilters.location ||
      !!summaryFilters.search,
    ...search,
    locationInput: location.searchInput,
    setLocationInput: location.setSearchInput,
    // Solo con las dos: un lote sin acción no abre nada.
    pendingAction:
      params.lot && params.action
        ? { lotId: params.lot, action: params.action }
        : null,
    clearAction: () => setParams({ lot: null, action: null }),
    // Cambiar de pestaña conserva los filtros: se mira lo mismo en la otra lista.
    setView: (view: (typeof WAREHOUSE_VIEWS)[number]) =>
      setParams({ view, page: 1 }),
    // La bodega y la ubicación son de una finca: al cambiarla dejan de valer.
    setFarm: (value: string | null) =>
      setParams({ farm: value, warehouse: null, location: null, page: 1 }),
    setWarehouse: (value: string | null) =>
      setParams({ warehouse: value, location: null, page: 1 }),
    setGrade: (value: Grade | null) => setParams({ grade: value, page: 1 }),
    setOrdering: (value: StockOrdering | null) =>
      setParams({ ordering: value, page: 1 }),
    setPage: (value: number) => setParams({ page: value }),
    // La finca elegida era de otro productor.
    setProducer: (value: string | null) =>
      setParams({
        producer: value,
        farm: null,
        warehouse: null,
        location: null,
        page: 1,
      }),
    clear: () =>
      setParams({
        farm: null,
        warehouse: null,
        grade: null,
        location: null,
        search: null,
        page: 1,
      }),
  };
}
