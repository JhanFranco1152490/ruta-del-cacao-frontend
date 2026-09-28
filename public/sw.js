const CACHE_NAME = 'cacao-shell-v1';
const APP_SHELL = ['/', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches
      .match(event.request)
      .then((cached) => cached ?? fetch(event.request)),
  );
});

// El navegador dispara este evento al volver la conexión, incluso con la app cerrada (donde
// lo soporte: hoy Chrome/Android). Sincronizar de verdad usa Dexie, que solo existe en la
// página, así que el Service Worker solo avisa a las pestañas abiertas.
self.addEventListener('sync', (event) => {
  if (event.tag !== 'cacao-sync') return;
  event.waitUntil(
    self.clients.matchAll().then((clients) => {
      for (const client of clients) client.postMessage({ type: 'cacao-sync' });
    }),
  );
});
