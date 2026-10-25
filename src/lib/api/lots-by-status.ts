import type { components } from '@/lib/api/schema';

import { apiFetch } from './client';
import { apiPath } from './path';

type Schemas = components['schemas'];
type Lot = Schemas['Lot'];

// El tope de página que acepta la API.
const PAGE_SIZE = 100;

// Todos los lotes de un estado del productor, página tras página: las pestañas de poscosecha los
// muestran juntos y los filtran por finca en el dispositivo. `producer` solo lo envía la cuenta
// técnica.
export async function fetchLotsByStatus(
  status: Lot['status'],
  producer: string | null,
  signal?: AbortSignal,
): Promise<Lot[]> {
  const lots: Lot[] = [];
  for (let page = 1, pages = 1; page <= pages; page++) {
    const result = await apiFetch<Schemas['PaginatedLotList']>(
      apiPath('/api/lots', {
        status,
        producer,
        page: page === 1 ? undefined : page,
        page_size: PAGE_SIZE,
      }),
      { signal },
    );
    lots.push(...result.results);
    pages = Math.ceil(result.count / PAGE_SIZE);
  }
  return lots;
}
