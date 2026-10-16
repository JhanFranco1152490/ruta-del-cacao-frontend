import { ACTIVITY_CACHE_PREFIX } from '@/lib/api/activity-read';
import { shiftMonth } from '@/lib/format/dates';

// Las actividades se guardan por mes: el calendario pide un mes y sin conexión muestra esa copia.
// La cuenta técnica guarda aparte lo de cada productor que eligió.
const MONTH_KEY_PREFIX = ACTIVITY_CACHE_PREFIX;

export const activityMonthCacheKey = (
  producer: string | null,
  month: string,
) =>
  producer
    ? `${MONTH_KEY_PREFIX}producer:${producer}:${month}`
    : `${MONTH_KEY_PREFIX}${month}`;

// Lo que lee la vista de pendientes. Lleva la misma forma que una copia de mes (una lista de
// actividades), así que la búsqueda de una actividad suelta también la recorre.
export const pendingCacheKey = (producer: string | null) =>
  producer
    ? `${MONTH_KEY_PREFIX}producer:${producer}:pending`
    : `${MONTH_KEY_PREFIX}pending`;

// Los meses que se guardan siempre para trabajar en campo sin conexión: desde el anterior al actual
// hasta dos después. Así quien sale sin señal lleva las labores que va a cerrar, sin haber abierto
// antes cada mes en el calendario. `today` es la fecha de Bogotá (yyyy-MM-dd).
const OFFLINE_WINDOW_OFFSETS = [-1, 0, 1, 2];

export const offlineWindowMonths = (today: string) =>
  OFFLINE_WINDOW_OFFSETS.map((offset) => shiftMonth(today.slice(0, 7), offset));
