import { getOfflineDb, type QueueStatus } from './db';

export type QueuedByParent = {
  parentId: string;
  resource: string;
  status: QueueStatus;
};

// Los registros de la cola de ciertos recursos, por el registro al que pertenecen (su padre). Así
// una pantalla sabe que algo suyo espera en el dispositivo aunque lo haya guardado otro dominio:
// el calendario marca una actividad como realizada mientras su realización, o el resultado de su
// monitoreo, espera conexión.
export async function listQueuedByParent(
  userId: string,
  resources: readonly string[],
): Promise<QueuedByParent[]> {
  if (resources.length === 0) return [];
  const items = await getOfflineDb(userId)
    .queue.where('resource')
    .anyOf([...resources])
    .toArray();
  return items.flatMap(({ parentId, resource, status }) =>
    parentId ? [{ parentId, resource, status }] : [],
  );
}
