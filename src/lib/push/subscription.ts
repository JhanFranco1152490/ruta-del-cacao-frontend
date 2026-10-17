import { postPushSubscription, removePushSubscription } from '@/lib/api/push';

import {
  deviceLabel,
  type PushEnvironment,
  pushEnvironment,
  pushSupport,
  vapidKeyBytes,
} from './support';

// En qué está este dispositivo: sin soporte, iPhone sin instalar, avisos bloqueados por la
// persona, por decidir o activados.
export type PushState =
  'unsupported' | 'ios-not-installed' | 'blocked' | 'prompt' | 'active';

type PushRegistration = { pushManager: PushManager };

// Lo que se le pide al navegador. Se recibe aparte para probar sin un navegador de verdad.
export type PushBrowser = {
  environment: () => PushEnvironment;
  permission: () => NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  // Sin Service Worker registrado (en desarrollo no se registra) no hay a quién entregar la push.
  registration: () => Promise<PushRegistration | undefined>;
};

export const browserPush: PushBrowser = {
  environment: pushEnvironment,
  permission: () => Notification.permission,
  requestPermission: () => Notification.requestPermission(),
  registration: () => navigator.serviceWorker.getRegistration(),
};

async function currentSubscription(browser: PushBrowser) {
  const registration = await browser.registration();
  return {
    registration,
    subscription: (await registration?.pushManager.getSubscription()) ?? null,
  };
}

export async function readPushState(
  browser: PushBrowser = browserPush,
): Promise<PushState> {
  const support = pushSupport(browser.environment());
  if (support !== 'supported') return support;
  if (browser.permission() === 'denied') return 'blocked';
  const { registration, subscription } = await currentSubscription(browser);
  if (!registration) return 'unsupported';
  return subscription && browser.permission() === 'granted'
    ? 'active'
    : 'prompt';
}

// Activar pide el permiso: solo al tocar el botón, nunca al abrir la app, porque los navegadores
// castigan a la página que lo pide sin más y el iPhone solo deja pedirlo así. Si la persona lo
// acepta, el navegador crea la suscripción y se guarda en el servidor.
export async function enablePush(
  publicKey: string,
  browser: PushBrowser = browserPush,
): Promise<PushState> {
  const permission = await browser.requestPermission();
  if (permission === 'denied') return 'blocked';
  if (permission !== 'granted') return 'prompt';
  const registration = await browser.registration();
  if (!registration) return 'unsupported';
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidKeyBytes(publicKey),
  });
  const { endpoint, keys } = subscription.toJSON();
  const { userAgent, maxTouchPoints } = browser.environment();
  await postPushSubscription({
    endpoint: endpoint!,
    keys: { p256dh: keys!.p256dh, auth: keys!.auth },
    device_label: deviceLabel(userAgent, maxTouchPoints),
  });
  return 'active';
}

// Desactivar en este dispositivo: primero el servidor, que con un error deja todo como estaba y se
// puede reintentar; después el navegador.
export async function disablePush(
  browser: PushBrowser = browserPush,
): Promise<PushState> {
  const { subscription } = await currentSubscription(browser);
  if (subscription) {
    await removePushSubscription(subscription.endpoint);
    await subscription.unsubscribe();
  }
  return 'prompt';
}

// Al cerrar sesión, antes de cerrarla en el servidor: un teléfono compartido no debe seguir
// recibiendo los avisos de quien salió. Nunca impide cerrar sesión. Sin conexión basta con
// desuscribir el navegador: el servidor borra la suscripción cuando el servicio de push le diga
// que ya no existe.
export async function forgetPushSubscription(
  browser: PushBrowser = browserPush,
) {
  try {
    if (pushSupport(browser.environment()) !== 'supported') return;
    const { subscription } = await currentSubscription(browser);
    if (!subscription) return;
    await removePushSubscription(subscription.endpoint).catch(() => {});
    await subscription.unsubscribe();
  } catch {
    // Sin suscripción que se pueda leer o borrar no hay nada que olvidar.
  }
}
