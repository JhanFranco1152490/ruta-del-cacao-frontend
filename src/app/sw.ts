/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from '@serwist/turbopack/worker';
import type {
  PrecacheEntry,
  RuntimeCaching,
  SerwistGlobalConfig,
} from 'serwist';
import { NetworkOnly, Serwist } from 'serwist';

import { OFFLINE_FALLBACK_ROUTE } from '../config/offline-routes';

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

// Nada de otro origen se guarda: la API (datos personales, siempre del servidor) y las teselas
// del mapa base (su política de uso no permite descargarlas en masa).
const otherOrigins: RuntimeCaching = {
  matcher: ({ url }) => url.origin !== self.location.origin,
  handler: new NetworkOnly(),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Un despliegue nuevo se activa de inmediato y borra lo guardado por el anterior.
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [otherOrigins, ...defaultCache],
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

serwist.addEventListeners();
