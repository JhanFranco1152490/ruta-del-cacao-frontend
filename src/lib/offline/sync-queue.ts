import type { SyncAdapter } from './adapters';
import { getOfflineDb, type QueueItem, type QueueOperation } from './db';

const adapters = new Map<string, SyncAdapter>();

export function registerAdapter(adapter: SyncAdapter) {
  adapters.set(adapter.resource, adapter);
}

export function clearAdapters() {
  adapters.clear();
}

export interface EnqueueInput {
  id: string;
  resource: string;
  operation: QueueOperation;
  parentId?: string;
  payload: unknown;
}

// Mismo id + reintento no duplica: si ya existe, se devuelve el item guardado sin tocarlo.
export async function enqueue(userId: string, input: EnqueueInput) {
  const db = getOfflineDb(userId);
  const existing = await db.queue.get(input.id);
  if (existing) return existing;

  const now = Date.now();
  const item: QueueItem = {
    ...input,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  await db.queue.add(item);
  return item;
}

function isReady(item: QueueItem, byId: Map<string, QueueItem>) {
  if (!item.parentId) return true;
  return byId.get(item.parentId)?.status === 'synced';
}

// Procesa lo que esté listo, en cascada (un hijo puede sincronizar en la misma llamada que su
// padre si el padre tiene éxito). Cada item se intenta como máximo una vez por llamada: un
// padre que falla no se reintenta en el mismo ciclo, para no martillar la red contra un error
// persistente — el próximo disparador (montar la app, `online`, aviso del Service Worker) lo
// vuelve a intentar.
export async function processQueue(userId: string) {
  const db = getOfflineDb(userId);
  const attempted = new Set<string>();
  let progressed = true;

  while (progressed) {
    progressed = false;
    const all = await db.queue.toArray();
    const byId = new Map(all.map((item) => [item.id, item]));
    const ready = all
      .filter((item) => item.status === 'pending' && !attempted.has(item.id))
      .sort((a, b) => a.createdAt - b.createdAt);

    for (const item of ready) {
      if (!isReady(item, byId)) continue;
      const adapter = adapters.get(item.resource);
      if (!adapter) continue;

      attempted.add(item.id);
      progressed = true;
      await db.queue.update(item.id, { status: 'syncing' });

      try {
        await adapter.send(item);
        await db.queue.update(item.id, {
          status: 'synced',
          updatedAt: Date.now(),
        });
        byId.set(item.id, { ...item, status: 'synced' });
      } catch (error) {
        const conflict = adapter.parseConflict(error);
        if (conflict) {
          await db.queue.update(item.id, {
            status: 'error',
            errorCode: conflict.code,
            errorMessage: conflict.message,
            updatedAt: Date.now(),
          });
        } else {
          await db.queue.update(item.id, {
            status: 'pending',
            updatedAt: Date.now(),
          });
        }
      }
    }
  }
}
