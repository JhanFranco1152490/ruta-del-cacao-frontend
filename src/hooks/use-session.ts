import { type QueryFunctionContext, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { isApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { readSessionSnapshot } from '@/lib/offline/session-snapshot';

export type Session = components['schemas']['Session'];
export type SessionUser = components['schemas']['SessionUser'];
// La copia del dispositivo, usada porque el servidor no respondió.
export type ResolvedSession = Session & { fromDevice?: true };

// Sin respuesta del servidor (sin red) se entra con la última cuenta confirmada en este
// dispositivo, dentro de la ventana sin conexión. Un error de la API (un 401) nunca usa la copia,
// ni una consulta cancelada.
export async function fetchSession(
  signal?: AbortSignal,
): Promise<ResolvedSession> {
  try {
    return await apiFetch<Session>('/api/auth/me', { signal });
  } catch (error) {
    if (isApiError(error) || signal?.aborted) throw error;
    const user = await readSessionSnapshot();
    if (!user) throw error;
    return { user, fromDevice: true };
  }
}

// La sesión es estado del servidor: una sola consulta que comparten la guardia y las pantallas
// de cualquier dominio que decidan qué mostrar según los permisos. `offlineFirst`: sin red se
// intenta igual (y cae a la copia) en vez de quedar en pausa.
const sessionQuery = {
  queryKey: queryKeys.session(),
  queryFn: ({ signal }: QueryFunctionContext) => fetchSession(signal),
  retry: false,
  staleTime: 5 * 60_000,
  networkMode: 'offlineFirst',
} as const;

export const useSession = () =>
  useQuery({ ...sessionQuery, select: (session) => session.user });

// Solo una sesión que confirmó el servidor renueva la ventana sin conexión.
export const useSessionConfirmed = () =>
  useQuery({ ...sessionQuery, select: (session) => !session.fromDevice })
    .data === true;
