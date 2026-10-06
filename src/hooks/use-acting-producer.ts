'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useSyncExternalStore } from 'react';

import { useSession } from '@/hooks/use-session';
import {
  getActingProducer,
  subscribeActingProducer,
  writeActingProducer,
} from '@/lib/acting-producer';
import { queryKeys } from '@/lib/api/query-keys';

// El productor bajo el que opera la cuenta técnica en esta pestaña. Cambiarlo descarta todo lo
// cargado menos la sesión: lo que había es del productor anterior y no debe verse bajo el nombre
// del nuevo; las pantallas abiertas lo piden de nuevo. Para una cuenta que no es superusuario
// no hace nada: su productor es el propio y no se elige.
export function useActingProducer() {
  const { data: user } = useSession();
  const queryClient = useQueryClient();
  const producerId = useSyncExternalStore(
    subscribeActingProducer,
    getActingProducer,
    () => null,
  );
  const userId = user?.id;
  const isSuperuser = user?.is_superuser === true;

  const choose = useCallback(
    (next: string | null) => {
      if (!userId || !isSuperuser) return;
      writeActingProducer(userId, next);
      void queryClient.resetQueries({
        predicate: (query) => query.queryKey[0] !== queryKeys.session()[0],
      });
    },
    [queryClient, userId, isSuperuser],
  );
  const clear = useCallback(() => choose(null), [choose]);

  return { producerId, choose, clear, isSuperuser };
}
