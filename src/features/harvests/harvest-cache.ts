import type { components } from '@/lib/api/schema';
import { shiftMonth } from '@/lib/format/dates';
import type { CachedRead } from '@/lib/offline/cached-read';
import { getOfflineDb } from '@/lib/offline/db';

type Harvest = components['schemas']['Harvest'];

// Las cosechas se guardan por mes: la lista pide un mes y sin conexión muestra esa copia. La
// cuenta técnica guarda aparte lo de cada productor que eligió.
const MONTH_KEY_PREFIX = 'harvests:';

export const harvestMonthCacheKey = (producer: string | null, month: string) =>
  producer
    ? `${MONTH_KEY_PREFIX}producer:${producer}:${month}`
    : `${MONTH_KEY_PREFIX}${month}`;

export const collectorsCacheKey = (producer: string | null) =>
  producer ? `harvest-collectors:producer:${producer}` : 'harvest-collectors';

// Los meses que se guardan siempre para consultar en campo sin conexión: el actual y el anterior,
// lo que ya se recogió en las últimas semanas. `today` es la fecha de Bogotá (yyyy-MM-dd).
export const offlineWindowMonths = (today: string) => [
  shiftMonth(today.slice(0, 7), -1),
  today.slice(0, 7),
];

// Una cosecha buscada en los meses guardados; si aparece en dos copias, vale la más reciente.
export async function findSavedHarvest(
  userId: string,
  id: string,
): Promise<CachedRead<Harvest> | null> {
  const months = await getOfflineDb(userId)
    .cache.where('key')
    .startsWith(MONTH_KEY_PREFIX)
    .toArray();
  let found: Required<CachedRead<Harvest>> | null = null;
  for (const { value, fetchedAt } of months) {
    // Estas entradas solo las escribe la lectura del mes, siempre con esta forma.
    const harvest = (value as Harvest[]).find((saved) => saved.id === id);
    if (harvest && (!found || fetchedAt > found.savedAt)) {
      found = { data: harvest, savedAt: fetchedAt };
    }
  }
  return found;
}
