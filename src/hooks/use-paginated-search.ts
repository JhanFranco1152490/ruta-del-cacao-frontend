'use client';

import { useEffect, useState } from 'react';

// Retrasa también la consulta, no solo la escritura de la URL. Al buscar se vuelve a la
// primera página; sin borrador, el campo sigue a la URL al navegar hacia atrás.
export function usePaginatedSearch(
  search: string,
  setParams: (values: { search: string | null; page: number }) => unknown,
) {
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => {
    if (draft === null || draft === search) return;
    const timer = setTimeout(() => {
      void setParams({ search: draft || null, page: 1 });
      setDraft(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [draft, search, setParams]);
  return {
    searchInput: draft ?? search,
    setSearchInput: (value: string) =>
      setDraft(value === search ? null : value),
  };
}
