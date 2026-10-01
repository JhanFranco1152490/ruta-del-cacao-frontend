import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FakePointsMap, loadFakePointsMap } from '@/test/fake-map';

import type { LoadPointsMapProvider, MapPoint } from './map-provider';
import { PointsMapPanel } from './points-map-panel';

const POINT: MapPoint = {
  id: 'f1',
  label: 'La Esperanza',
  detail: 'Cúcuta · Activa',
  position: { latitude: 7.89, longitude: -72.5 },
  tone: 'ok',
};

function renderPanel(
  points: MapPoint[],
  loadProvider: LoadPointsMapProvider = loadFakePointsMap,
) {
  render(
    <PointsMapPanel
      emptyMessage="Aún no hay fincas para mostrar en el mapa."
      label="Mapa de mis fincas"
      loadProvider={loadProvider}
      points={points}
    />,
  );
}

describe('PointsMapPanel', () => {
  it('shows a skeleton while the map loads', () => {
    renderPanel([POINT], () => new Promise(() => {}));

    expect(screen.getByRole('status')).toHaveTextContent('Cargando mapa…');
  });

  it('draws one marker per point', async () => {
    renderPanel([POINT]);

    expect(
      await screen.findByRole('region', { name: 'Mapa de mis fincas' }),
    ).toHaveTextContent('La Esperanza (ok) 7.89, -72.5');
    expect(
      screen.queryByText('Aún no hay fincas para mostrar en el mapa.'),
    ).not.toBeInTheDocument();
  });

  it('keeps the map visible and explains when there is nothing to show', async () => {
    renderPanel([]);

    expect(
      await screen.findByRole('region', { name: 'Mapa de mis fincas' }),
    ).toHaveTextContent('Aún no hay fincas para mostrar en el mapa.');
  });

  it('offers a retry when the map fails to load', async () => {
    const user = userEvent.setup();
    const loadProvider = vi
      .fn<LoadPointsMapProvider>()
      .mockRejectedValueOnce(new Error('sin red'))
      .mockResolvedValue(FakePointsMap);
    renderPanel([POINT], loadProvider);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La lista de abajo sigue disponible.',
    );
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText(/La Esperanza/)).toBeInTheDocument();
  });

  // Leaflet usa z-index de 400 a 1000: sin un contexto de apilamiento propio, el mapa tapaba
  // los diálogos de confirmación (z-50) y no se podían usar.
  it('keeps the map layers below dialogs', async () => {
    renderPanel([POINT]);

    const region = await screen.findByRole('region', {
      name: 'Mapa de mis fincas',
    });
    expect(region.querySelector('[data-slot="map-frame"]')).toHaveClass(
      'isolate',
    );
  });
});
