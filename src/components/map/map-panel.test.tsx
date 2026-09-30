import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FakeMap, loadFakeMap } from '@/test/fake-map';

import { MapPanel } from './map-panel';
import type { LoadMapProvider } from './map-provider';

const LOCATION = { latitude: '7.8234567', longitude: '-72.5123456' };

describe('MapPanel', () => {
  it('shows a skeleton while the provider loads', () => {
    render(
      <MapPanel
        loadProvider={() => new Promise(() => {})}
        location={LOCATION}
        onLocationChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Cargando mapa…');
  });

  it('places the marker on the typed point and reports a tapped point with API precision', async () => {
    const user = userEvent.setup();
    const onLocationChange = vi.fn();
    render(
      <MapPanel
        loadProvider={loadFakeMap}
        location={LOCATION}
        onLocationChange={onLocationChange}
      />,
    );

    expect(
      await screen.findByText('Marcador: 7.8234567, -72.5123456'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tocar el mapa' }));

    expect(onLocationChange).toHaveBeenCalledWith({
      latitude: '7.1234568',
      longitude: '-72.5000000',
    });
  });

  it('hides the marker while the typed point is incomplete', async () => {
    render(
      <MapPanel
        loadProvider={loadFakeMap}
        location={{ latitude: '7.', longitude: '' }}
        onLocationChange={vi.fn()}
      />,
    );

    expect(
      await screen.findByText('Marcador: sin marcador'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Toca el mapa para marcar el punto de la finca.'),
    ).toBeInTheDocument();
  });

  it('blocks map input while disabled', async () => {
    render(
      <MapPanel
        disabled
        loadProvider={loadFakeMap}
        location={LOCATION}
        onLocationChange={vi.fn()}
      />,
    );

    expect(
      await screen.findByRole('button', { name: 'Tocar el mapa' }),
    ).toBeDisabled();
  });

  it('offers a retry when the provider fails to load', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const loadProvider = vi
      .fn<LoadMapProvider>()
      .mockRejectedValueOnce(new Error('sin red'))
      .mockResolvedValue(FakeMap);
    render(
      <MapPanel
        loadProvider={loadProvider}
        location={LOCATION}
        onLocationChange={vi.fn()}
        onRetry={onRetry}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible cargar el mapa.',
    );
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText(/Marcador:/)).toBeInTheDocument();
    expect(onRetry).toHaveBeenCalledOnce();
    expect(loadProvider).toHaveBeenCalledTimes(2);
  });

  it('switches to the error state when the loaded map fails', async () => {
    const user = userEvent.setup();
    render(
      <MapPanel
        loadProvider={loadFakeMap}
        location={LOCATION}
        onLocationChange={vi.fn()}
      />,
    );

    await user.click(
      await screen.findByRole('button', { name: 'Fallar mapa base' }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Puedes seguir usando el GPS o escribir las coordenadas.',
    );
  });
});
