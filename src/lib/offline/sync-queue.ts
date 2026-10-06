import { getActingProducer } from '@/lib/acting-producer';

import type { SyncAdapter, SyncRecovery } from './adapters';
import { getOfflineDb, type QueueItem, type QueueOperation } from './db';

const adapters = new Map<string, SyncAdapter>();

export function registerAdapter(adapter: SyncAdapter) {
  adapters.set(adapter.resource, adapter);
}

export function clearAdapters() {
  adapters.clear();
}

type SyncedListener = (item: QueueItem, adapter: SyncAdapter) => void;

const syncedListeners = new Set<SyncedListener>();

// Avisa cada vez que un registro llega al servidor, para que lo que muestra sus datos se vuelva a
// pedir aunque la pantalla que lo guardó ya no esté abierta. Devuelve la función que deja de
// escuchar.
export function onItemSynced(listener: SyncedListener) {
  syncedListeners.add(listener);
  return () => {
    syncedListeners.delete(listener);
  };
}

// El registro ya salió de la cola: un fallo de quien escucha no debe frenar el resto del envío.
function notifySynced(item: QueueItem, adapter: SyncAdapter) {
  for (const listener of syncedListeners) {
    try {
      listener(item, adapter);
    } catch {
      // Solo se pierde el aviso; los datos se vuelven a pedir al vencer su tiempo de vida.
    }
  }
}

export interface EnqueueInput {
  id: string;
  resource: string;
  operation: QueueOperation;
  parentId?: string;
  payload: unknown;
}

// Ya hay un item con ese id y quien encola pidió no conservarlo en silencio: el contenido nuevo
// no se guardó.
export class QueueItemExistsError extends Error {
  constructor() {
    super('Ya hay un registro pendiente con este identificador.');
    this.name = 'QueueItemExistsError';
  }
}

// Mismo id + reintento no duplica: si ya existe, se devuelve el item guardado sin tocarlo. Con
// `rejectExisting` se lanza `QueueItemExistsError` en su lugar, para cuando el contenido nuevo
// no es un reintento sino un cambio distinto que se perdería sin avisar.
export async function enqueue(
  userId: string,
  input: EnqueueInput,
  { rejectExisting = false } = {},
) {
  const db = getOfflineDb(userId);
  return db.transaction('rw', db.queue, async () => {
    const existing = await db.queue.get(input.id);
    if (existing) {
      if (rejectExisting) throw new QueueItemExistsError();
      return existing;
    }

    // Un hijo (una parcela de una finca que sigue en la cola) viaja bajo el mismo productor que su
    // padre aunque la pestaña haya cambiado de productor entre uno y otro: de otro modo el hijo
    // buscaría su finca en un productor que no es el suyo.
    const parent = input.parentId
      ? await db.queue.get(input.parentId)
      : undefined;
    const actingProducerId =
      parent?.actingProducerId ?? getActingProducer() ?? undefined;

    const now = Date.now();
    const item: QueueItem = {
      ...input,
      ...(actingProducerId && { actingProducerId }),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    await db.queue.add(item);
    return item;
  });
}

// Se está enviando en este momento: corregirlo o descartarlo ahora podría perderse (el envío
// en curso usa el contenido anterior y, si tiene éxito, retira el item de la cola).
export class QueueItemBusyError extends Error {
  constructor() {
    super('El registro se está enviando.');
    this.name = 'QueueItemBusyError';
  }
}

// Ya no está en la cola: se sincronizó (y salió) o se descartó desde otra pantalla.
export class QueueItemMissingError extends Error {
  constructor() {
    super('El registro ya no está en la cola.');
    this.name = 'QueueItemMissingError';
  }
}

// Otros registros de la cola apuntan a este: descartarlo los dejaría esperando a un padre que
// nunca llegará al servidor.
export class QueueItemHasDependentsError extends Error {
  constructor() {
    super('Otros registros dependen de este.');
    this.name = 'QueueItemHasDependentsError';
  }
}

// Corregir y reenviar: reemplaza el contenido de un item pendiente o con error y lo devuelve a
// `pending`. Corre en una transacción para que no se cruce con `claim` (ver más abajo).
export async function resubmit(userId: string, id: string, payload: unknown) {
  const db = getOfflineDb(userId);
  await db.transaction('rw', db.queue, async () => {
    const item = await db.queue.get(id);
    if (!item) throw new QueueItemMissingError();
    if (item.status === 'syncing') throw new QueueItemBusyError();
    // En Dexie, `undefined` en `update` borra la propiedad: el motivo del error anterior no
    // sobrevive a la corrección.
    await db.queue.update(id, {
      payload,
      status: 'pending',
      errorCode: undefined,
      errorMessage: undefined,
      errorData: undefined,
      updatedAt: Date.now(),
    });
  });
}

// Descartar a propósito (la interfaz pide confirmación). Si el item ya no está, no hay nada
// que descartar y no es un error.
export async function discard(userId: string, id: string) {
  const db = getOfflineDb(userId);
  await db.transaction('rw', db.queue, async () => {
    const item = await db.queue.get(id);
    if (!item) return;
    if (item.status === 'syncing') throw new QueueItemBusyError();
    const dependents = await db.queue.where('parentId').equals(id).count();
    if (dependents > 0) throw new QueueItemHasDependentsError();
    await db.queue.delete(id);
  });
}

// Toma un item para enviarlo: relee y marca `syncing` en una sola transacción, y devuelve el
// contenido vigente. Sin esto, una corrección hecha entre la lectura de la cola y el envío se
// perdería: se mandaría la copia vieja y el item saldría de la cola al tener éxito.
async function claim(userId: string, id: string) {
  const db = getOfflineDb(userId);
  return db.transaction('rw', db.queue, async () => {
    const current = await db.queue.get(id);
    if (current?.status !== 'pending') return undefined;
    await db.queue.update(id, { status: 'syncing' });
    return { ...current, status: 'syncing' as const };
  });
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
  // Una sola recuperación por item y pasada: si el reintento convertido también falla, sigue
  // el camino normal (bandeja o reintento) en vez de girar sin fin.
  const recovered = new Set<string>();
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
      const claimed = await claim(userId, item.id);
      // Entre la lectura y ahora se descartó o dejó de estar pendiente: no se envía.
      if (!claimed) continue;
      progressed = true;

      try {
        await adapter.send(claimed);
        // Se retira de la cola en vez de conservarse como `synced`: ya cumplió su función
        // (encolar, reintentar, permitir que sus hijos lo esperen) y no hay razón para
        // guardar para siempre un envío que ya terminó bien.
        await db.queue.delete(item.id);
        byId.delete(item.id);
        notifySynced(claimed, adapter);
      } catch (error) {
        const recovery = recovered.has(item.id)
          ? null
          : safeRecover(adapter, claimed, error);
        if (recovery) {
          recovered.add(item.id);
          attempted.delete(item.id);
          await db.queue.update(item.id, {
            operation: recovery.operation,
            payload: recovery.payload,
            status: 'pending',
            updatedAt: Date.now(),
          });
          continue;
        }
        const conflict = safeParseConflict(adapter, error);
        if (conflict) {
          await db.queue.update(item.id, {
            status: 'error',
            errorCode: conflict.code,
            errorMessage: conflict.message,
            errorData: conflict.data,
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
// Igual que safeParseConflict: un adapter que revienta al intentar recuperar no tumba la cola.
function safeRecover(
  adapter: SyncAdapter,
  item: QueueItem,
  error: unknown,
): SyncRecovery | null {
  try {
    return adapter.recover?.(item, error) ?? null;
  } catch {
    return null;
  }
}

function safeParseConflict(adapter: SyncAdapter, error: unknown) {
  try {
    return adapter.parseConflict(error);
  } catch {
    return null;
  }
}
