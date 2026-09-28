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

// Sin padre local: o no depende de nadie, o su padre ya sincronizó y salió de la cola (se
// borra al tener éxito, ver más abajo) — en ambos casos está listo. Solo espera cuando el
// padre sigue en la cola y todavía no llegó a `synced`.
function isReady(item: QueueItem, byId: Map<string, QueueItem>) {
  if (!item.parentId) return true;
  const parent = byId.get(item.parentId);
  return !parent || parent.status === 'synced';
}

// Una llamada por usuario a la vez: sin esto, dos disparadores casi simultáneos (montar la
// app y el evento `online`, o el efecto de React corriendo dos veces) leerían la cola antes
// de que el primero alcanzara a marcar nada, y mandarían el mismo item dos veces.
const inFlight = new Map<string, Promise<void>>();

export function processQueue(userId: string) {
  const running = inFlight.get(userId);
  if (running) return running;

  const run = runQueue(userId).finally(() => inFlight.delete(userId));
  inFlight.set(userId, run);
  return run;
}

// Procesa lo que esté listo, en cascada (un hijo puede sincronizar en la misma llamada que su
// padre si el padre tiene éxito). Cada item se intenta como máximo una vez por llamada: un
// padre que falla no se reintenta en el mismo ciclo, para no martillar la red contra un error
// persistente — el próximo disparador (montar la app, `online`, aviso del Service Worker) lo
// vuelve a intentar.
async function runQueue(userId: string) {
  const db = getOfflineDb(userId);
  // Un item que sigue `syncing` al empezar una llamada nueva pertenece a un intento anterior
  // que nunca terminó (la pestaña se cerró, se quedó sin batería): se retoma como pendiente
  // en vez de quedar bloqueado para siempre.
  await db.queue
    .where('status')
    .equals('syncing')
    .modify({ status: 'pending' });

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
        // Se retira de la cola en vez de conservarse como `synced`: ya cumplió su función
        // (encolar, reintentar, permitir que sus hijos lo esperen) y no hay razón para
        // guardar para siempre un envío que ya terminó bien.
        await db.queue.delete(item.id);
        byId.delete(item.id);
      } catch (error) {
        const conflict = safeParseConflict(adapter, error);
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

// Un adapter que revienta al clasificar el error no debe tumbar la cola entera: se trata
// igual que un error de red (se reintenta), no como un conflicto real.
function safeParseConflict(adapter: SyncAdapter, error: unknown) {
  try {
    return adapter.parseConflict(error);
  } catch {
    return null;
  }
}
