import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';

export type Session = components['schemas']['Session'];
export type SessionUser = components['schemas']['SessionUser'];
type LoginRequest = components['schemas']['LoginRequest'];
type PasswordResetConfirmRequest =
  components['schemas']['PasswordResetConfirmRequest'];

export const fetchSession = (signal?: AbortSignal) =>
  apiFetch<Session>('/api/auth/me', { signal });
export const postLogin = (body: LoginRequest) =>
  apiFetch<Session>('/api/auth/login', { method: 'POST', body });
export const postLogout = () =>
  apiFetch<void>('/api/auth/logout', { method: 'POST' });
export const postPasswordResetRequest = (email: string) =>
  apiFetch<void>('/api/auth/password-reset/request', {
    method: 'POST',
    body: { email },
  });
export const postPasswordResetConfirm = (body: PasswordResetConfirmRequest) =>
  apiFetch<void>('/api/auth/password-reset/confirm', { method: 'POST', body });

// La sesión es estado del servidor: una sola consulta que comparten la guardia y la pantalla.
export const useSession = () =>
  useQuery({
    queryKey: queryKeys.session(),
    queryFn: ({ signal }) => fetchSession(signal),
    select: (session) => session.user,
    retry: false,
    staleTime: 5 * 60_000,
  });

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postLogin,
    onSuccess: (session) => {
      // Si la sesión anterior terminó sin cerrar sesión en esta pestaña (venció o se cerró en
      // otra), su caché sigue aquí: sin limpiarla, otra cuenta vería los datos de la anterior.
      queryClient.clear();
      queryClient.setQueryData(queryKeys.session(), session);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  // Solo se limpia la caché si el cierre tuvo éxito: si falló (p. ej. sin conexión) la persona
  // sigue en su panel y puede reintentar.
  return useMutation({
    mutationFn: postLogout,
    onSuccess: () => queryClient.clear(),
  });
}

export const useRequestPasswordReset = () =>
  useMutation({ mutationFn: postPasswordResetRequest });

export const useConfirmPasswordReset = () =>
  useMutation({ mutationFn: postPasswordResetConfirm });
