import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';

export type Session = components['schemas']['Session'];
export type SessionUser = components['schemas']['SessionUser'];

export const fetchSession = (signal?: AbortSignal) =>
  apiFetch<Session>('/api/auth/me', { signal });

// La sesión es estado del servidor: una sola consulta que comparten la guardia y las pantallas
// de cualquier dominio que decidan qué mostrar según los permisos.
export const useSession = () =>
  useQuery({
    queryKey: queryKeys.session(),
    queryFn: ({ signal }) => fetchSession(signal),
    select: (session) => session.user,
    retry: false,
    staleTime: 5 * 60_000,
  });
