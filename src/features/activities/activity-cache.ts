import type { components } from '@/lib/api/schema';
import type { CachedRead } from '@/lib/offline/cached-read';
import { getOfflineDb } from '@/lib/offline/db';

type AgriculturalActivity = components['schemas']['AgriculturalActivity'];

// Las actividades se guardan por mes: el calendario pide un mes y sin conexión muestra esa copia.
// La cuenta técnica guarda aparte lo de cada productor que eligió.
const MONTH_KEY_PREFIX = 'agricultural-activities:';

export const activityMonthCacheKey = (
  producer: string | null,
  month: string,
) =>
  producer
    ? `${MONTH_KEY_PREFIX}producer:${producer}:${month}`
    : `${MONTH_KEY_PREFIX}${month}`;

export const assigneesCacheKey = (producer: string | null) =>
  producer
    ? `agricultural-activity-assignees:producer:${producer}`
    : 'agricultural-activity-assignees';

// Una actividad buscada en los meses guardados. Una reprogramada puede seguir en la copia vieja
// de su mes anterior: vale la de la copia más reciente.
export async function findSavedActivity(
  userId: string,
  id: string,
): Promise<CachedRead<AgriculturalActivity> | null> {
  const months = await getOfflineDb(userId)
    .cache.where('key')
    .startsWith(MONTH_KEY_PREFIX)
    .toArray();
  let found: Required<CachedRead<AgriculturalActivity>> | null = null;
  for (const { value, fetchedAt } of months) {
    // Estas entradas solo las escribe la lectura del mes, siempre con esta forma.
    const activity = (value as AgriculturalActivity[]).find(
      (saved) => saved.id === id,
    );
    if (activity && (!found || fetchedAt > found.savedAt)) {
      found = { data: activity, savedAt: fetchedAt };
    }
  }
  return found;
}
