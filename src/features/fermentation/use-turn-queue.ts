'use client';

import { useMemo } from 'react';

import { useQueueItems } from '@/hooks/use-queue-items';
import { useQueueMutation, useQueuedRecord } from '@/hooks/use-queue-mutation';
import { queryKeys } from '@/lib/api/query-keys';
import { discard, sendWhenOnline } from '@/lib/offline/sync-queue';

import {
  enqueueTurn,
  getQueuedTurn,
  queuedTurnOf,
  resubmitTurn,
  TURN_RESOURCE,
  turnQueueId,
  type TurnPayload,
} from './turn-queue';

// Los volteos que siguen en el dispositivo. Se actualiza sola cuando la cola cambia: al llegar al
// servidor dejan de estar aquí y aparecen en la lista que se vuelve a leer.
export function useQueuedTurns(userId: string | undefined) {
  const items = useQueueItems(userId);
  return useMemo(
    () =>
      (items ?? [])
        .filter((item) => item.resource === TURN_RESOURCE)
        .map(queuedTurnOf),
    [items],
  );
}

// El volteo que sigue en el dispositivo, leído una sola vez: con él se abre la pantalla al corregir
// desde la bandeja.
export const useQueuedTurn = (turnId: string) =>
  useQueuedRecord(
    (userId) => queryKeys.fermentation.queued(userId, turnId),
    (userId) => getQueuedTurn(userId, turnId),
  );

type SaveInput = {
  payload: TurnPayload;
  // Se corrige el que el servidor rechazó, en vez de guardar uno nuevo.
  correcting: boolean;
};

// Todo volteo se guarda primero en el dispositivo; con conexión se intenta enviar de inmediato y,
// sin ella, la cola lo hará al volver la red.
export const useSaveTurn = () =>
  useQueueMutation(
    async (userId: string, { payload, correcting }: SaveInput) => {
      if (correcting) {
        await resubmitTurn(userId, payload);
      } else {
        await enqueueTurn(userId, payload);
      }
      sendWhenOnline(userId);
    },
  );

export const useDiscardTurn = () =>
  useQueueMutation((userId: string, turnId: string) =>
    discard(userId, turnQueueId(turnId)),
  );
