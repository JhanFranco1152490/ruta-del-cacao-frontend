/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from '@serwist/turbopack/worker';
import type {
  PrecacheEntry,
  RuntimeCaching,
  SerwistGlobalConfig,
} from 'serwist';
import { NetworkOnly, Serwist } from 'serwist';

import {
  OFFLINE_FALLBACK_ROUTE,
  OFFLINE_PRECACHE_ROUTES,
} from '../config/offline-routes';
import { noticeUrl, openFromNotice, pushNotice } from '../lib/push/sw-messages';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// El evento de sincronización en segundo plano no está en los tipos estándar: solo lo que se usa.
interface BackgroundSyncEvent extends ExtendableEvent {
  tag: string;
}

const networkOnly = new NetworkOnly();

// Nunca se guarda la API (datos personales, siempre del servidor) ni nada de otro origen, como las
// teselas del mapa base (su política de uso no permite descargarlas en masa). La API se excluye
// también por su ruta: si algún día se sirve desde el mismo origen, sigue sin guardarse.
const neverStored: RuntimeCaching = {
  matcher: ({ url, sameOrigin }) =>
    !sameOrigin || url.pathname.startsWith('/api/'),
  handler: networkOnly,
};

// Estas pantallas leen su consulta (?id=, filtros) en el navegador: el HTML guardado de la ruta
// sirve para cualquier consulta. Solo navegaciones: una petición de datos de la misma URL no es
// HTML y nunca debe recibirlo.
const savedScreens = new Set<string>(OFFLINE_PRECACHE_ROUTES);
const savedScreenWithQuery: RuntimeCaching = {
  matcher: ({ request, url }) =>
    request.mode === 'navigate' &&
    url.origin === self.location.origin &&
    savedScreens.has(url.pathname),
  handler: async (options) =>
    (await serwist.matchPrecache(options.url.pathname)) ??
    networkOnly.handle(options),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Un despliegue nuevo se activa de inmediato y borra lo guardado por el anterior.
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [neverStored, savedScreenWithQuery, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: OFFLINE_FALLBACK_ROUTE,
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
});

// Sincronizar de verdad usa la base del dispositivo, que solo existe en la página: el Service
// Worker solo avisa a las pestañas abiertas. El navegador dispara este evento al volver la red,
// incluso con la app cerrada, donde lo soporta.
self.addEventListener('sync', (event) => {
  const sync = event as BackgroundSyncEvent;
  if (sync.tag !== 'cacao-sync') return;
  sync.waitUntil(
    self.clients.matchAll().then((clients) => {
      for (const client of clients) client.postMessage({ type: 'cacao-sync' });
    }),
  );
});

// Un aviso del servidor, también con la app cerrada. Un contenido que no se puede leer muestra un
// aviso genérico: el navegador castiga a quien recibe una push y no muestra nada.
self.addEventListener('push', (event) => {
  let data: unknown = null;
  try {
    data = event.data?.json();
  } catch {
    // Sin contenido legible queda el aviso genérico.
  }
  const { title, options } = pushNotice(data);
  event.waitUntil(self.registration.showNotification(title, options));
});

// Tocar el aviso trae la app al frente en su enlace, o la abre.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windows) =>
        openFromNotice({
          windows,
          openWindow: (url) => self.clients.openWindow(url),
          origin: self.location.origin,
          url: noticeUrl(event.notification.data),
        }),
      ),
  );
});

serwist.addEventListeners();
