import { isNeverLoaded, isStalePlaceholder } from '@/lib/offline/paused-read';

import type { SalePage, SaleSummary } from './api';

type Read<T> = {
  data: { data: T; savedAt?: number } | undefined;
  isPending: boolean;
  isPlaceholderData: boolean;
  fetchStatus: string;
  isError: boolean;
  error: unknown;
};

// Lo que la pantalla de ventas muestra de sus dos lecturas (la lista y las cifras). Sin conexión, al
// cambiar de mes o de filtro `keepPreviousData` deja a la vista lo de la consulta anterior: eso no se
// muestra. Mientras llega la copia de este mes se espera, y si la lectura quedó en pausa sin copia se
// pide conexión una vez.
export function salesRead(
  sales: Read<SalePage>,
  summary: Read<SaleSummary>,
  hasConnection: boolean,
) {
  const salesStale = isStalePlaceholder(sales, hasConnection);
  const paused = sales.fetchStatus === 'paused';
  return {
    page: salesStale ? undefined : sales.data?.data,
    savedAt: salesStale ? undefined : sales.data?.savedAt,
    summary: isStalePlaceholder(summary, hasConnection)
      ? undefined
      : summary.data?.data,
    loading: sales.isPending || (salesStale && !paused),
    neverLoaded: isNeverLoaded(sales) || (salesStale && paused),
  };
}
