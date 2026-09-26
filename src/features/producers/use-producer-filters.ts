'use client';

import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';
import { useEffect, useState } from 'react';

import type { ProducerQuery, ProducerStatus } from './api';

const STATUSES = [
  'active',
  'inactive',
] as const satisfies readonly ProducerStatus[];
const SEARCH_DELAY_MS = 300;

// Los filtros viven en la URL: se pueden compartir y el botón atrás los respeta. Los valores
// malformados (?pagina=abc, ?estado=zzz) caen al valor por defecto en vez de romper la lista.
const parsers = {
  search: parseAsString.withDefault(''),
  status: parseAsStringLiteral(STATUSES),
  municipality: parseAsString,
  page: parseAsInteger.withDefault(1),
};

// En la URL los parámetros van en español, como las rutas.
const urlKeys = {
  search: 'buscar',
  status: 'estado',
  municipality: 'municipio',
  page: 'pagina',
};

export function useProducerFilters() {
  const [params, setParams] = useQueryStates(parsers, { urlKeys });
  // Texto que la persona está escribiendo, antes de que llegue a la URL. La pausa se escribe a
  // mano: `limitUrlUpdates: debounce()` de nuqs solo retrasa la URL, pero el estado (y con él
  // la clave de la consulta) cambiaría con cada tecla y se pediría una lista por letra.
  const [draft, setDraft] = useState<string | null>(null);
  const searchInput = draft ?? params.search;

  useEffect(() => {
    if (draft === null || draft === params.search) return;
    const timer = setTimeout(() => {
      void setParams({ search: draft || null, page: 1 });
      setDraft(null);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, params.search, setParams]);

  const page = Math.max(1, params.page);
  const query: ProducerQuery = {
    search: params.search.trim() || undefined,
    status: params.status ?? undefined,
    municipality: params.municipality ?? undefined,
    page,
  };

  return {
    query,
    searchInput,
    // Si el texto vuelve a ser el de la URL, no queda un borrador que tape la URL (p. ej. al
    // usar el botón atrás después).
    setSearchInput: (value: string) =>
      setDraft(value === params.search ? null : value),
    status: params.status,
    municipality: params.municipality,
    page,
    setStatus: (status: ProducerStatus | null) =>
      setParams({ status, page: 1 }),
    setMunicipality: (code: string | null) =>
      setParams({ municipality: code, page: 1 }),
    setPage: (next: number) => setParams({ page: next }),
  };
}
