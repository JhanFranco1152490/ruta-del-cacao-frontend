self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Ninguna versión anterior de este Service Worker debe dejar copias en caché: cachear el
  // documento de la página serviría HTML de un despliegue anterior, con referencias a
  // archivos que el siguiente despliegue ya borró (el nombre de esos archivos cambia en cada
  // build). No se cachea nada aquí a propósito, pero esta limpieza cubre cualquier versión
  // previa que sí lo haya hecho.
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
    ]),
  );
});

// Sin responder nada propio: deja pasar cada petición a la red tal cual. Un Service Worker
// registrado necesita un handler de `fetch` para que el navegador lo considere instalable,
// pero cachear el shell aquí es justo lo que causó el problema de arriba — se retoma cuando
// exista una pantalla que de verdad necesite leerse sin conexión.
self.addEventListener('fetch', () => {});

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
