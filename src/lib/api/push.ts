import { apiFetch } from './client';
import type { components } from './schema';

type Schemas = components['schemas'];

// La llave pública con la que el navegador se suscribe. Sin llaves en el servidor llega `null`: la
// push está apagada y la app no ofrece activarla.
export const fetchPushConfig = (signal?: AbortSignal) =>
  apiFetch<Schemas['PushConfig']>('/api/notifications/push-config', {
    signal,
  });

// Guardar la suscripción de este navegador. Repetirla solo actualiza sus llaves.
export const postPushSubscription = (
  body: Schemas['PushSubscriptionCreateRequest'],
) =>
  apiFetch<Schemas['PushSubscription']>(
    '/api/notifications/push-subscriptions',
    { method: 'POST', body },
  );

// Va por POST y con la dirección en el cuerpo: así no queda en los registros del servidor.
export const removePushSubscription = (endpoint: string) =>
  apiFetch<void>('/api/notifications/push-subscriptions/remove', {
    method: 'POST',
    body: { endpoint } satisfies Schemas['PushSubscriptionRemoveRequest'],
  });
