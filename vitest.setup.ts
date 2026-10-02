import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

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

// Una petición sin handler es un error: ningún test debe tocar la red real.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
