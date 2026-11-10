'use client';

import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';

import type { BuyerType } from './api';
import type { BuyerFilters, BuyerStatusFilter } from './buyer-filters';
import { BUYER_TYPES } from './buyer-types';

const STATUSES = [
  'active',
  'inactive',
  'all',
] as const satisfies readonly BuyerStatusFilter[];

// Los filtros viven en la URL: se pueden compartir y el botón atrás los respeta. Los valores
// malformados (?tipo=zzz, ?estado=zzz) caen al valor por defecto en vez de romper la lista.
const parsers = {
  search: parseAsString.withDefault(''),
  type: parseAsStringLiteral(BUYER_TYPES),
  status: parseAsStringLiteral(STATUSES).withDefault('active'),
  producer: parseAsString,
  buyer: parseAsString,
};

// En la URL los parámetros van en español, como las rutas.
const urlKeys = {
  search: 'buscar',
  type: 'tipo',
  status: 'estado',
  producer: 'productor',
  buyer: 'comprador',
};

export function useBuyerFilters() {
  const [params, setParams] = useQueryStates(parsers, {
    urlKeys,
    clearOnDefault: true,
  });

  const filters: BuyerFilters = {
    search: params.search,
    type: params.type ?? '',
    status: params.status,
  };

  return {
    filters,
    // Vacíos en la URL son «sin elegir». El productor solo lo usa la cuenta técnica.
    producer: params.producer || null,
    // El comprador con la hoja abierta (en escritorio, con su fila resaltada).
    buyer: params.buyer || null,
    setSearch: (search: string) => setParams({ search: search || null }),
    setType: (type: BuyerType | '') => setParams({ type: type || null }),
    setStatus: (status: BuyerStatusFilter) => setParams({ status }),
    // El comprador abierto era de otro productor: al cambiarlo, se cierra.
    setProducer: (producer: string | null) =>
      setParams({ producer, buyer: null }),
    clear: () => setParams({ search: null, type: null, status: null }),
    showBuyer: (buyer: string | null) => setParams({ buyer }),
    // «Ver el comprador» desde un aviso de repetido: los filtros podrían esconderlo (inactivo, otro
    // tipo), así que se quitan para que su fila quede a la vista.
    revealBuyer: (buyer: string) =>
      setParams({ buyer, search: null, type: null, status: 'all' }),
  };
}
