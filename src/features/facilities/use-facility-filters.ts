'use client';

import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';

import {
  FACILITY_STATUS_ORDER,
  FACILITY_TYPE_ORDER,
} from '@/lib/facility-labels';

import type { FacilityFilters } from './facility-filters';

// Los valores malformados (?tipo=bodega, ?estado=zzz) caen a «Todos» en vez de romper la lista.
const parsers = {
  type: parseAsStringLiteral([
    ...FACILITY_TYPE_ORDER,
    'all',
  ] as const).withDefault('all'),
  status: parseAsStringLiteral([
    ...FACILITY_STATUS_ORDER,
    'all',
  ] as const).withDefault('all'),
  farm: parseAsString,
  choose: parseAsStringLiteral(['1'] as const),
  element: parseAsString,
  producer: parseAsString,
};

// En la URL los parámetros van en español, como las rutas. `elegir=1` pide la elección de finca.
const urlKeys = {
  type: 'tipo',
  status: 'estado',
  farm: 'finca',
  choose: 'elegir',
  element: 'elemento',
  producer: 'productor',
};

export function useFacilityFilters() {
  const [params, setParams] = useQueryStates(parsers, {
    urlKeys,
    clearOnDefault: true,
  });

  const filters: FacilityFilters = {
    type: params.type,
    status: params.status,
  };

  return {
    filters,
    // Vacíos en la URL son «sin elegir».
    farm: params.farm || null,
    choose: params.choose === '1',
    element: params.element || null,
    // Solo lo usa la cuenta técnica.
    producer: params.producer || null,
    setType: (type: FacilityFilters['type']) => setParams({ type }),
    setStatus: (status: FacilityFilters['status']) => setParams({ status }),
    // La finca no es un filtro sino qué finca se está viendo: se conserva.
    clear: () => setParams({ type: null, status: null }),
    // Cambiar de finca conserva los filtros: se compara lo mismo en otra finca.
    openFarm: (farm: string) => setParams({ farm, choose: null }),
    chooseFarm: () => setParams({ farm: null, choose: '1' }),
    // La finca elegida era de otro productor: al cambiarlo, se vuelve a elegir.
    setProducer: (producer: string | null) =>
      setParams({ producer, farm: null }),
    showElement: (element: string | null) => setParams({ element }),
  };
}
