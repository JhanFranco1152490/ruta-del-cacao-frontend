'use client';

import { type QueryKey, useMutation, useQuery } from '@tanstack/react-query';

import { useSession } from '@/hooks/use-session';

// Leer y escribir la cola del dispositivo no usa la red. Por defecto TanStack Query pausa todo
// mientras no hay conexión (espera a que vuelva): eso dejaba "Guardando…" colgado y el registro
// sin guardar hasta recuperar la señal, justo lo contrario de lo que se busca.
const LOCAL_ONLY = 'always' as const;

// Un registro de la cola del dispositivo, leído una sola vez: el formulario se inicializa con
// esta lectura y no debe adoptar una posterior mientras la persona corrige.
export function useQueuedRecord<T>(
  queryKey: (userId: string) => QueryKey,
  read: (userId: string) => Promise<T>,
) {
  const { data: user } = useSession();
  const userId = user?.id;
  return useQuery({
    queryKey: queryKey(userId ?? ''),
    queryFn: () => read(userId!),
    enabled: !!userId,
    staleTime: Infinity,
    gcTime: 0,
    networkMode: LOCAL_ONLY,
  });
}

// Una escritura en la cola del dispositivo a nombre de la sesión activa.
export function useQueueMutation<T>(
  action: (userId: string, input: T) => Promise<void>,
) {
  const { data: user } = useSession();
  return useMutation({
    networkMode: LOCAL_ONLY,
    mutationFn: async (input: T) => {
      if (!user) throw new Error('No hay una sesión activa.');
      await action(user.id, input);
    },
  });
}
