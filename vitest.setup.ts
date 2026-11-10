import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

import { toastManager } from '@/lib/notify';
import { server } from '@/test/server';

// Leaflet necesita un navegador real (tamaños, teselas por red): en las pruebas cada mapa se
// reemplaza por un doble que muestra sus marcadores como texto.
vi.mock('@/config/map', async () => {
  const fake = await import('@/test/fake-map');
  return {
    loadMapProvider: fake.loadFakeMap,
    loadPointsMapProvider: fake.loadFakePointsMap,
    loadMunicipalityMapProvider: fake.loadFakeMunicipalityMap,
  };
});

// jsdom no implementa el desplazamiento de la página; las pantallas lo usan para llevar la vista
// al mapa o a una tarjeta. Las pruebas que corren sin DOM (las de archivos por la red) no lo
// necesitan.
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = vi.fn();
}

// jsdom no navega: un clic en un enlace de verdad (el de un `Link` sin router, o un `<a href>`) hace
// que imprima «Not implemented: navigation to another Document» y ensucie la salida de la suite. Lo
// que una prueba mira de un enlace es su `href` o lo que hizo su `onClick` (el `router.push` del
// doble), y eso corre antes de este oyente, que está en el documento y solo corta lo que queda. Solo
// los enlaces: cortar cualquier clic impediría enviar un formulario con su botón.
if (typeof document !== 'undefined') {
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest('a[href]')) {
      event.preventDefault();
    }
  });
}

// Una petición sin handler es un error: ningún test debe tocar la red real.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  // El gestor de avisos es global: lo que un test avisó no debe verse en el siguiente.
  toastManager.close();
});
afterAll(() => server.close());
