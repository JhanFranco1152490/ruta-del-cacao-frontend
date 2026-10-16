'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useQueueMutation } from '@/hooks/use-queue-mutation';
import { queryKeys } from '@/lib/api/query-keys';
import { discard, sendWhenOnline } from '@/lib/offline/sync-queue';

import {
  type ControlPayload,
  controlQueueId,
  enqueueControl,
} from './control-queue';
import { postNoControlNeeded } from './monitoring-api';

// Todo control se guarda primero en el dispositivo; con conexión se intenta enviar de inmediato
// y, sin ella, la cola lo hará al volver la red.
export const useSaveControl = () =>
  useQueueMutation(
    async (
      userId: string,
      {
        detectionId,
        payload,
      }: { detectionId: string; payload: ControlPayload },
    ) => {
      await enqueueControl(userId, detectionId, payload);
      sendWhenOnline(userId);
    },
  );

export const useDiscardControl = () =>
  useQueueMutation((userId: string, controlId: string) =>
    discard(userId, controlQueueId(controlId)),
  );

// Decidir que una detección no requiere control es solo en línea: sin red falla en el acto. La
// detección cambia en el detalle del monitoreo, en el calendario y en el aviso.
export function useNoControlNeeded() {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: postNoControlNeeded,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.agriculturalActivities.all(),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.health.all() }),
      ]),
  });
}
