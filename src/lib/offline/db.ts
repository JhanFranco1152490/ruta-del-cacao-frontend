import Dexie, { type EntityTable } from 'dexie';

export type QueueOperation = 'create' | 'update';
export type QueueStatus = 'pending' | 'syncing' | 'synced' | 'error';

export interface QueueItem {
  id: string;
  resource: string;
  operation: QueueOperation;
  parentId?: string;
  payload: unknown;
  status: QueueStatus;
  errorCode?: string;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CacheEntry {
  key: string;
  value: unknown;
  fetchedAt: number;
}

export interface MetaEntry {
  key: string;
  value: string;
}

export class OfflineDb extends Dexie {
  queue!: EntityTable<QueueItem, 'id'>;
  cache!: EntityTable<CacheEntry, 'key'>;
  meta!: EntityTable<MetaEntry, 'key'>;

  constructor(userId: string) {
    super(`cacao-offline-${userId}`);
    this.version(1).stores({
      queue: 'id, status, parentId, resource',
      cache: 'key',
      meta: 'key',
    });
  }
}

// Una instancia por usuario y proceso: sin este mapa cada llamada abriría una conexión nueva
// y las suscripciones reactivas (estado de sincronización) no verían las mismas escrituras.
const instances = new Map<string, OfflineDb>();

export function getOfflineDb(userId: string): OfflineDb {
  let db = instances.get(userId);
  if (!db) {
    db = new OfflineDb(userId);
    instances.set(userId, db);
  }
  return db;
}

// Se borra al cerrar sesión: son solo lecturas cacheadas. `queue` (pendientes y bandeja de
// error) se conserva a propósito, para no perder trabajo de campo sin sincronizar.
export async function clearOfflineCache(userId: string) {
  await getOfflineDb(userId).cache.clear();
}
