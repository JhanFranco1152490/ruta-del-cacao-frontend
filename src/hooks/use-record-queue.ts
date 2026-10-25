'use client';

import { type QueryKey } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useQueueItems } from '@/hooks/use-queue-items';
import { useQueueMutation, useQueuedRecord } from '@/hooks/use-queue-mutation';
import {
  type RecordPayload,
  type RecordQueue,
} from '@/lib/offline/record-queue';
import { discard, sendWhenOnline } from '@/lib/offline/sync-queue';

// Los registros que siguen en el dispositivo. Se actualiza sola cuando la cola cambia: al llegar al
// servidor dejan de estar aquí y aparecen en la lista que se vuelve a leer.
export function useQueuedRecords<TRequest extends { id: string }>(
  queue: RecordQueue<TRequest>,
  userId: string | undefined,
) {
  const items = useQueueItems(userId);
  return useMemo(
    () =>
      (items ?? [])
        .filter((item) => item.resource === queue.resource)
        .map(queue.queuedOf),
    [items, queue],
  );
}

// El registro que sigue en el dispositivo, leído una sola vez: con él se abre la pantalla al
// corregir desde la bandeja.
export const useQueuedLotRecord = <TRequest extends { id: string }>(
  queue: RecordQueue<TRequest>,
  queryKey: (userId: string) => QueryKey,
  recordId: string,
) => useQueuedRecord(queryKey, (userId) => queue.get(userId, recordId));

type SaveInput<TRequest> = {
  payload: RecordPayload<TRequest>;
  // Se corrige el que el servidor rechazó, en vez de guardar uno nuevo.
  correcting: boolean;
};

// Todo registro se guarda primero en el dispositivo; con conexión se intenta enviar de inmediato y,
// sin ella, la cola lo hará al volver la red.
export const useSaveLotRecord = <TRequest extends { id: string }>(
  queue: RecordQueue<TRequest>,
) =>
  useQueueMutation(
    async (userId: string, { payload, correcting }: SaveInput<TRequest>) => {
      if (correcting) {
        await queue.resubmit(userId, payload);
      } else {
        await queue.enqueue(userId, payload);
      }
      sendWhenOnline(userId);
    },
  );

export const useDiscardLotRecord = <TRequest extends { id: string }>(
  queue: RecordQueue<TRequest>,
) =>
  useQueueMutation((userId: string, recordId: string) =>
    discard(userId, queue.queueId(recordId)),
  );
