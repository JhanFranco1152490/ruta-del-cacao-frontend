import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { onItemSynced } from '@/lib/offline/sync-queue';

// Cuando un registro de la cola llega al servidor, vuelve a pedir lo que su adapter dice que
// cambió. Va montado en el marco de la sesión, que siempre está: si lo hiciera cada pantalla, un
// envío que termina mientras la persona está en otra pantalla dejaría la copia vieja al volver.
// Las consultas que no están en pantalla solo quedan marcadas y se piden al montarse otra vez.
export function useRefreshAfterSync() {
  const queryClient = useQueryClient();

  useEffect(
    () =>
      onItemSynced((item, adapter) => {
        for (const queryKey of adapter.refreshAfterSync?.(item) ?? []) {
          void queryClient.invalidateQueries({ queryKey });
        }
      }),
    [queryClient],
  );
}
