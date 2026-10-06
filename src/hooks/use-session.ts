import {
  type Query,
  type QueryFunctionContext,
  useQuery,
} from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { isApiError, isUnauthorized } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { flushPendingLogout } from '@/lib/offline/pending-logout';
import {
  forgetLastSession,
  readSessionSnapshot,
} from '@/lib/offline/session-snapshot';

export type Session = components['schemas']['Session'];
export type SessionUser = components['schemas']['SessionUser'];
// La copia del dispositivo, usada porque el servidor no respondió.
export type ResolvedSession = Session & { fromDevice?: true };

// Sin respuesta del servidor (sin red) se entra con la última cuenta confirmada en este
// dispositivo, dentro de la ventana sin conexión. Un error de la API nunca usa la copia, ni una
// consulta cancelada; un 401 además la borra: la sesión terminó (venció o se revocó el acceso) y
// sin red no debe poder abrirse de nuevo.
export async function fetchSession(
  signal?: AbortSignal,
): Promise<ResolvedSession> {
  // Una sesión cerrada sin conexión se cierra en el servidor antes de preguntar quién entró: con
  // las cookies aún vivas, `me` devolvería la cuenta y deshacería el cierre. Si todavía no hay red
  // falla aquí, sin tocar la copia del dispositivo (que el cierre ya borró).
  await flushPendingLogout();
  try {
    return await apiFetch<Session>('/api/auth/me', { signal });
  } catch (error) {
    if (isUnauthorized(error)) await forgetLastSession();
    if (isApiError(error) || signal?.aborted) throw error;
    const user = await readSessionSnapshot();
    if (!user) throw error;
    return { user, fromDevice: true };
  }
}

// Con la copia se vuelve a preguntar al servidor seguido: el navegador no avisa cuando una red sin
// internet vuelve a tenerlo, y hasta confirmar la sesión no se renueva la ventana sin conexión.
const DEVICE_SESSION_RECHECK_MS = 30_000;

// La sesión es estado del servidor: una sola consulta que comparten la guardia y las pantallas
// de cualquier dominio que decidan qué mostrar según los permisos. `offlineFirst`: sin red se
// intenta igual (y cae a la copia) en vez de quedar en pausa.
const sessionQuery = {
  queryKey: queryKeys.session(),
  queryFn: ({ signal }: QueryFunctionContext) => fetchSession(signal),
  retry: false,
  staleTime: 5 * 60_000,
  refetchInterval: (query: Query<ResolvedSession>) =>
    query.state.data?.fromDevice ? DEVICE_SESSION_RECHECK_MS : false,
  networkMode: 'offlineFirst',
} as const;

export const useSession = () =>
  useQuery({ ...sessionQuery, select: (session) => session.user });

// 'device' también cuando el navegador dice tener red: el servidor no respondió.
export const useSessionSource = () =>
  useQuery({
    ...sessionQuery,
    select: (session) => (session.fromDevice ? 'device' : 'server'),
  }).data;

// Solo una sesión que confirmó el servidor renueva la ventana sin conexión.
export const useSessionConfirmed = () => useSessionSource() === 'server';
