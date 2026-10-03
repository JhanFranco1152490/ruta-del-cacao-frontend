import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { installFakeGps, restoreGeolocation } from '@/test/fake-geolocation';

import { PlotGpsButton } from './plot-gps-button';

afterEach(() => {
  restoreGeolocation();
  vi.useRealTimers();
});

function setup() {
  const gps = installFakeGps();
  const onVertex = vi.fn();
  render(<PlotGpsButton disabled={false} onVertex={onVertex} />);
  return { gps, onVertex, user: userEvent.setup() };
}

describe('PlotGpsButton', () => {
  it('asks for the position only when tapped, and adds the vertex with its accuracy', async () => {
    const { gps, onVertex, user } = setup();
    expect(gps.geolocation.watchPosition).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Agregar vértice' }));
    act(() => gps.reading(4, { latitude: 7.8, longitude: -72.5 }));

    expect(onVertex).toHaveBeenCalledWith({
      point: { latitude: 7.8, longitude: -72.5 },
      accuracyM: 4,
    });
    expect(screen.getByRole('status')).toHaveTextContent('precisión de ±4 m');
  });

  it('shows the accuracy while it is still looking for a better reading', async () => {
    const { gps, user } = setup();

    await user.click(screen.getByRole('button', { name: 'Agregar vértice' }));
    act(() => gps.reading(25));

    expect(
      screen.getByRole('button', { name: /Capturando GPS… ±25 m/ }),
    ).toBeDisabled();
  });

  it('accepts a poor reading but warns without blocking', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { gps, onVertex } = setup();

    await act(async () => {
      screen.getByRole('button', { name: 'Agregar vértice' }).click();
    });
    act(() => gps.reading(35));
    await act(() => vi.advanceTimersByTimeAsync(31_000));

    expect(onVertex).toHaveBeenCalledWith(
      expect.objectContaining({ accuracyM: 35 }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Precisión baja (±35 m): espera unos segundos o busca un lugar despejado',
    );
    expect(
      screen.getByRole('button', { name: 'Agregar vértice' }),
    ).toBeEnabled();
  });

  it('explains a denied permission and points to drawing on the map', async () => {
    const { gps, onVertex, user } = setup();

    await user.click(screen.getByRole('button', { name: 'Agregar vértice' }));
    act(() => gps.fail(1));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No permitiste acceder a tu ubicación',
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'sigue dibujando en el mapa',
    );
    expect(onVertex).not.toHaveBeenCalled();
  });

  it('explains when the device cannot give a position', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: undefined,
    });
    const onVertex = vi.fn();
    render(<PlotGpsButton disabled={false} onVertex={onVertex} />);

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Agregar vértice' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'no permite capturar la ubicación',
    );
  });

  it('does nothing while disabled', () => {
    installFakeGps();
    render(<PlotGpsButton disabled onVertex={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: 'Agregar vértice' }),
    ).toBeDisabled();
  });
});
