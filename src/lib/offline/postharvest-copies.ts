import { isApiError } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';

import type { CachedRead } from './cached-read';
import { getOfflineDb } from './db';

type FermentationProcess = components['schemas']['FermentationProcess'];

// Un lote encontrado en la copia de una lista de poscosecha, con su proceso y la fecha de la copia.
export type CopiedProcess = {
  kind: 'fermentation';
  process: FermentationProcess;
  savedAt: number;
};

// Las listas de poscosecha guardan cada lote con su origen, así que con ellas se arma la ficha de un
// lote sin conexión. La cuenta técnica guarda una copia por productor (`{clave}:producer:{id}`). El
// secado sumará aquí la suya.
const COPIES = [{ kind: 'fermentation', key: 'fermentation' }] as const;

const isCopyOf = (entryKey: string, key: string) =>
  entryKey === key || entryKey.startsWith(`${key}:producer:`);

export async function findLotInPostharvestCopies(
  userId: string,
  lotId: string,
): Promise<CopiedProcess | null> {
  const entries = await getOfflineDb(userId)
    .cache.toArray()
    .catch(() => []);
  for (const { kind, key } of COPIES) {
    for (const entry of entries) {
      if (!isCopyOf(entry.key, key)) continue;
      const process = (entry.value as FermentationProcess[]).find(
        (item) => item.lot.id === lotId,
      );
      if (process) return { kind, process, savedAt: entry.fetchedAt };
    }
  }
  return null;
}

// Lee de la red y, sin respuesta del servidor, arma lo pedido (`pick`) con el lote de una copia de
// poscosecha. Como `readThroughCache`, un error de la API no usa la copia: se muestra como siempre.
export async function readWithPostharvestCopy<T>(
  userId: string,
  lotId: string,
  fetcher: () => Promise<T>,
  pick: (copied: CopiedProcess) => T,
): Promise<CachedRead<T>> {
  try {
    return { data: await fetcher() };
  } catch (error) {
    if (isApiError(error)) throw error;
    const copied = await findLotInPostharvestCopies(userId, lotId);
    if (!copied) throw error;
    return { data: pick(copied), savedAt: copied.savedAt };
  }
}
