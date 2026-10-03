import { isApiError } from '@/lib/api/errors';

import { getOfflineDb } from './db';

export type CachedRead<T> = { data: T; savedAt?: number };

// Lee de la red y guarda una copia en el dispositivo. Sin respuesta del servidor (sin red)
// devuelve la última copia con su fecha. Un error de la API (permiso, sesión) no usa la copia:
// se muestra como siempre. Las copias se borran al cerrar sesión.
export async function readThroughCache<T>(
  userId: string,
  key: string,
  fetcher: () => Promise<T>,
): Promise<CachedRead<T>> {
  try {
    const data = await fetcher();
    try {
      await getOfflineDb(userId).cache.put({
        key,
        value: data,
        fetchedAt: Date.now(),
      });
    } catch {
      // Solo se pierde la copia para usar sin conexión.
    }
    return { data };
  } catch (error) {
    if (isApiError(error)) throw error;
    const saved = await getOfflineDb(userId)
      .cache.get(key)
      .catch(() => undefined);
    if (!saved) throw error;
    return { data: saved.value as T, savedAt: saved.fetchedAt };
  }
}
