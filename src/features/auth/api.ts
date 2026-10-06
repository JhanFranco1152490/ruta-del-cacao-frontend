import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { isNetworkFailure } from '@/lib/api/errors';
import { postLogout } from '@/lib/api/logout';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { clearOfflineCache } from '@/lib/offline/db';
import {
  flushPendingLogout,
  markPendingLogout,
} from '@/lib/offline/pending-logout';
import { clearSessionSnapshot } from '@/lib/offline/session-snapshot';
import { recordLogin } from '@/lib/offline/session-clock';

import {
  fetchSession,
  useSession,
  useSessionConfirmed,
  type Session,
  type SessionUser,
} from '@/hooks/use-session';

// La sesión vive en hooks/ porque la consultan varios dominios; aquí se reexporta para auth.
export {
  fetchSession,
  useSession,
  useSessionConfirmed,
  type Session,
  type SessionUser,
};
type LoginRequest = components['schemas']['LoginRequest'];
type PasswordResetConfirmRequest =
  components['schemas']['PasswordResetConfirmRequest'];

export const postLogin = (body: LoginRequest) =>
  apiFetch<Session>('/api/auth/login', { method: 'POST', body });
export const postPasswordResetRequest = (email: string) =>
  apiFetch<void>('/api/auth/password-reset/request', {
    method: 'POST',
    body: { email },
  });
export const postPasswordResetConfirm = (body: PasswordResetConfirmRequest) =>
  apiFetch<void>('/api/auth/password-reset/confirm', { method: 'POST', body });

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    // Si quedó un cierre de sesión sin enviar, se envía antes: el inicio nuevo no debe heredar
    // la sesión que la persona ya había cerrado, ni ser cerrado después por esa marca.
    mutationFn: async (body: LoginRequest) => {
      await flushPendingLogout();
      return postLogin(body);
    },
    onSuccess: (session) => {
      // Si la sesión anterior terminó sin cerrar sesión en esta pestaña (venció o se cerró en
      // otra), su caché sigue aquí: sin limpiarla, otra cuenta vería los datos de la anterior.
      queryClient.clear();
      queryClient.setQueryData(queryKeys.session(), session);
      void recordLogin(session.user.id);
    },
  });
}

// Devuelve dónde se cerró: 'server' si el servidor respondió, 'device' si no había conexión y el
// cierre en el servidor queda pendiente. Cerrar sesión siempre debe poder hacerse: quien entrega
// el teléfono en el campo no tiene red, y su cuenta no puede quedar abierta por eso.
export function useLogout() {
  const queryClient = useQueryClient();
  // Solo se limpia la caché si el cierre tuvo éxito (en el servidor o, sin red, en el
  // dispositivo): si el servidor respondió con un error, la persona sigue en su panel y puede
  // reintentar.
  return useMutation({
    mutationFn: async () => {
      try {
        await postLogout();
        return 'server' as const;
      } catch (error) {
        if (!isNetworkFailure(error)) throw error;
        markPendingLogout();
        return 'device' as const;
      }
    },
    onSuccess: () => {
      const session = queryClient.getQueryData<Session>(queryKeys.session());
      if (session) {
        void clearOfflineCache(session.user.id);
        void clearSessionSnapshot(session.user.id);
      }
      queryClient.clear();
    },
  });
}

export type Profile = components['schemas']['Profile'];

export const fetchProfile = (signal?: AbortSignal) =>
  apiFetch<Profile>('/api/auth/profile', { signal });

// Los datos personales de la cuenta se piden al abrir "Mi cuenta" y nunca se guardan en el
// dispositivo: sin conexión no se piden.
export const useProfile = (enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.profile(),
    queryFn: ({ signal }) => fetchProfile(signal),
    enabled,
  });

export const useRequestPasswordReset = () =>
  useMutation({ mutationFn: postPasswordResetRequest });

export const useConfirmPasswordReset = () =>
  useMutation({ mutationFn: postPasswordResetConfirm });

export const postActivationConfirm = (
  body: components['schemas']['ActivationConfirmRequest'],
) => apiFetch<void>('/api/auth/activation/confirm', { method: 'POST', body });
export const useConfirmActivation = () =>
  useMutation({ mutationFn: postActivationConfirm });
