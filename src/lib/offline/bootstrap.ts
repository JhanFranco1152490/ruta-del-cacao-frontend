import { getOfflineDb } from './db';
import { isOrphaned } from './session-clock';
import { processQueue } from './sync-queue';

// Se corre al montar la app con una sesión válida, al volver la conexión y cuando el Service
// Worker avisa que disparó una sincronización en segundo plano (ver session-shell.tsx).
export async function runOfflineBootstrap(userId: string) {
  try {
    if (await isOrphaned(userId)) {
      await getOfflineDb(userId).queue.clear();
    }
    await processQueue(userId);
  } catch {
    // Mismo motivo que session-clock.recordLogin: un fallo de almacenamiento local no debe
    // quedar como una promesa rechazada sin manejar.
  }
}
