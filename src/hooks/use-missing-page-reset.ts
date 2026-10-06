'use client';

import { useEffect } from 'react';

import { isApiError } from '@/lib/api/errors';

// Una página que ya no existe (se filtró o se borró contenido) no es un error para la persona:
// se vuelve a la primera. Devuelve si la página falta, para no mostrar el error mientras tanto.
export function useMissingPageReset(
  error: unknown,
  page: number,
  setPage: (page: number) => unknown,
): boolean {
  const missing = isApiError(error) && error.status === 404 && page > 1;
  useEffect(() => {
    if (missing) void setPage(1);
  }, [missing, setPage]);
  return missing;
}
