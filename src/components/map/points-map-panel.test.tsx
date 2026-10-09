import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FakePointsMap, loadFakePointsMap } from '@/test/fake-map';

import type { LoadPointsMapProvider, MapPoint, MapShape } from './map-provider';
import { PointsMapPanel } from './points-map-panel';

const POINT: MapPoint = {
  id: 'f1',
  label: 'La Esperanza',
  detail: 'Cúcuta · Activa',
  position: { latitude: 7.89, longitude: -72.5 },
  tone: 'ok',
};

const SHAPE: MapShape = {
  id: 'pl1',
  label: 'P1',
  positions: [
    { latitude: 7.89, longitude: -72.5 },
    { latitude: 7.89, longitude: -72.49 },
    { latitude: 7.88, longitude: -72.49 },
  ],
  tone: 'ok',
};

function renderPanel(
  points: MapPoint[],
  loadProvider: LoadPointsMapProvider = loadFakePointsMap,
  shapes: MapShape[] = [],
  toolbar?: string,
) {
  render(
    <PointsMapPanel
      emptyMessage="Aún no hay fincas para mostrar en el mapa."
      label="Mapa de mis fincas"
      loadProvider={loadProvider}
      points={points}
      shapes={shapes}
      toolbar={toolbar}
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

  it('draws the shapes and does not say the map is empty when there are only shapes', async () => {
    renderPanel([], loadFakePointsMap, [SHAPE]);

    const region = await screen.findByRole('region', {
      name: 'Mapa de mis fincas',
    });
    expect(region).toHaveTextContent('P1 (ok) 3 vértices');
    expect(region).not.toHaveTextContent(
      'Aún no hay fincas para mostrar en el mapa.',
    );
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

  it('hides and shows the map with a button that only has an icon', async () => {
    renderPanel([POINT]);
    const region = await screen.findByRole('region', {
      name: 'Mapa de mis fincas',
    });
    expect(region).toHaveTextContent('La Esperanza (ok) 7.89, -72.5');

    await userEvent.click(screen.getByRole('button', { name: 'Ocultar mapa' }));
    expect(region).not.toHaveTextContent('La Esperanza');

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar mapa' }));
    expect(region).toHaveTextContent('La Esperanza (ok) 7.89, -72.5');
  });

  it('hides the base layer selector together with the map', async () => {
    renderPanel([POINT]);
    await screen.findByRole('region', { name: 'Mapa de mis fincas' });
    expect(screen.getByRole('group', { name: 'Mapa base' })).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Ocultar mapa' }));

    expect(
      screen.queryByRole('group', { name: 'Mapa base' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the toolbar visible while the map loads', async () => {
    renderPanel([POINT], () => new Promise(() => {}), [], 'Total: 3');
    expect(screen.getByText('Total: 3')).toBeVisible();
  });

  it('keeps the toolbar when the map is hidden', async () => {
    renderPanel([POINT], loadFakePointsMap, [], 'Total: 3');
    await screen.findByRole('region', { name: 'Mapa de mis fincas' });

    await userEvent.click(screen.getByRole('button', { name: 'Ocultar mapa' }));

    expect(screen.getByText('Total: 3')).toBeVisible();
  });

  it('offers the satellite base layer', async () => {
    renderPanel([POINT]);
    await screen.findByRole('region', { name: 'Mapa de mis fincas' });

    await userEvent.click(screen.getByRole('button', { name: 'Satélite' }));

    expect(screen.getByRole('button', { name: 'Satélite' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('says which polygon was touched', async () => {
    const onSelectShape = vi.fn();
    render(
      <PointsMapPanel
        emptyMessage="Sin parcelas."
        label="Mapa de parcelas"
        loadProvider={loadFakePointsMap}
        onSelectShape={onSelectShape}
        points={[]}
        shapes={[SHAPE]}
      />,
    );

    await userEvent.click(
      await screen.findByRole('button', { name: 'Tocar P1' }),
    );

    expect(onSelectShape).toHaveBeenCalledWith('pl1');
  });
});
