import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { syncActingProducer, writeActingProducer } from '@/lib/acting-producer';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { clearOfflineCache } from '@/lib/offline/db';
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
export const postLogout = () =>
  apiFetch<void>('/api/auth/logout', { method: 'POST' });
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
    mutationFn: postLogin,
    onSuccess: (session) => {
      // Si la sesión anterior terminó sin cerrar sesión en esta pestaña (venció o se cerró en
      // otra), su caché sigue aquí: sin limpiarla, otra cuenta vería los datos de la anterior.
      queryClient.clear();
      queryClient.setQueryData(queryKeys.session(), session);
      syncActingProducer(session.user);
      void recordLogin(session.user.id);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  // Solo se limpia la caché si el cierre tuvo éxito: si falló (p. ej. sin conexión) la persona
  // sigue en su panel y puede reintentar.
  return useMutation({
    mutationFn: postLogout,
    onSuccess: () => {
      const session = queryClient.getQueryData<Session>(queryKeys.session());
      if (session) {
        void clearOfflineCache(session.user.id);
        void clearSessionSnapshot(session.user.id);
        // En un equipo compartido, el siguiente no debe heredar el productor de la cuenta técnica.
        writeActingProducer(session.user.id, null);
      }
      syncActingProducer(null);
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
