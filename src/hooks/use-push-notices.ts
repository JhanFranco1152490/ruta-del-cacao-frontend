'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchPushConfig } from '@/lib/api/push';
import { queryKeys } from '@/lib/api/query-keys';
import {
  disablePush,
  enablePush,
  type PushState,
  readPushState,
} from '@/lib/push/subscription';

// La llave pública del servidor, que no cambia mientras la app está abierta. Sin conexión no se
// pide, y sin ella no se ofrece activar: activar también necesita al servidor.
export const usePushConfig = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: queryKeys.push.config(),
    queryFn: ({ signal }) => fetchPushConfig(signal),
    enabled,
    staleTime: Infinity,
  });

// En qué está este dispositivo. Lo dice el navegador, no el servidor; se vuelve a leer al volver a
// la pestaña, porque la persona pudo cambiar el permiso en la configuración del navegador.
export const usePushState = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: queryKeys.push.subscription(),
    queryFn: () => readPushState(),
    enabled,
    networkMode: 'always',
  });

function usePushChange<T>(change: (variables: T) => Promise<PushState>) {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: change,
    onSuccess: (state) =>
      queryClient.setQueryData(queryKeys.push.subscription(), state),
  });
}

export const useEnablePush = () =>
  usePushChange((publicKey: string) => enablePush(publicKey));

export const useDisablePush = () => usePushChange(() => disablePush());
