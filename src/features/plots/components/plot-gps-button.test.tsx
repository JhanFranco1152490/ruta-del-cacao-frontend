import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useWarmGps } from '@/hooks/use-warm-gps';
import { installFakeGps, restoreGeolocation } from '@/test/fake-geolocation';

import { PlotGpsButton } from './plot-gps-button';

afterEach(() => {
  restoreGeolocation();
  vi.useRealTimers();
});

// El editor es quien tiene el GPS encendido (el mapa también lo usa): aquí se hace igual.
function Harness({
  onVertex,
  disabled = false,
}: {
  onVertex: (vertex: unknown) => void;
  disabled?: boolean;
}) {
  const warm = useWarmGps();
  return <PlotGpsButton disabled={disabled} onVertex={onVertex} warm={warm} />;
}

function setup(disabled = false) {
  const gps = installFakeGps();
  const onVertex = vi.fn();
  render(<Harness disabled={disabled} onVertex={onVertex} />);
  return { gps, onVertex, user: userEvent.setup() };
}

const addVertex = () =>
  screen.getByRole('button', { name: /Agregar vértice|Capturando GPS/ });

describe('PlotGpsButton — without the GPS on', () => {
  it('asks for the position only when tapped, and adds the vertex with its accuracy', async () => {
    const { gps, onVertex, user } = setup();
    expect(gps.geolocation.watchPosition).not.toHaveBeenCalled();

    await user.click(addVertex());
    act(() => gps.reading(4, { latitude: 7.8, longitude: -72.5 }));

    expect(onVertex).toHaveBeenCalledWith({
      point: { latitude: 7.8, longitude: -72.5 },
      accuracyM: 4,
    });
    expect(screen.getByText(/precisión de ±4 m/)).toBeInTheDocument();
  });

  it('turns the GPS on while it captures, so the next corners are instant', async () => {
    const { gps, user } = setup();

    await user.click(addVertex());
    act(() => gps.reading(4));

    expect(
      screen.getByRole('button', { name: /GPS activo · ±4 m/ }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the accuracy while it is still looking for a better reading', async () => {
    const { gps, user } = setup();

    await user.click(addVertex());
    act(() => gps.reading(25));

    expect(
      screen.getByRole('button', { name: /Capturando GPS… ±25 m/ }),
    ).toBeDisabled();
    expect(screen.getByText(/Mantén el celular quieto/)).toBeInTheDocument();
  });

  it('accepts a poor reading but warns without blocking', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { gps, onVertex } = setup();

    await act(async () => {
      addVertex().click();
    });
    act(() => gps.reading(35));
    await act(() => vi.advanceTimersByTimeAsync(31_000));

    expect(onVertex).toHaveBeenCalledWith(
      expect.objectContaining({ accuracyM: 35 }),
    );
    expect(
      screen.getByText(
        'Precisión baja (±35 m): espera unos segundos o busca un lugar despejado',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Agregar vértice' }),
    ).toBeEnabled();
  });

  it('explains a denied permission and points to drawing on the map', async () => {
    const { gps, onVertex, user } = setup();

    await user.click(addVertex());
    act(() => gps.fail(1));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No permitiste acceder a tu ubicación');
    expect(alert).toHaveTextContent('sigue dibujando en el mapa');
    expect(onVertex).not.toHaveBeenCalled();
  });

  it('explains when the device cannot give a position', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: undefined,
    });
    render(<Harness onVertex={vi.fn()} />);

    await userEvent.setup().click(addVertex());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'no permite capturar la ubicación',
    );
  });

  it('does nothing while disabled', () => {
    setup(true);

    expect(addVertex()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Activar GPS' })).toBeDisabled();
  });
});

describe('PlotGpsButton — with the GPS warmed up', () => {
  it('turns on at the person’s request and shows the live accuracy', async () => {
    const { gps, user } = setup();

    await user.click(screen.getByRole('button', { name: 'Activar GPS' }));
    expect(screen.getByText(/Buscando satélites/)).toBeInTheDocument();
    act(() => gps.reading(18));

    expect(
      screen.getByRole('button', { name: /GPS activo · ±18 m/ }),
    ).toBeInTheDocument();
    expect(gps.geolocation.watchPosition).toHaveBeenCalledOnce();
  });

  it('adds the vertex at once with the average of the last readings, with no new wait', async () => {
    const { gps, onVertex, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Activar GPS' }));
    act(() => gps.reading(10, { latitude: 7.0, longitude: -72.0 }));
    act(() => gps.reading(10, { latitude: 7.2, longitude: -72.2 }));
    const watches = gps.geolocation.watchPosition.mock.calls.length;

    await user.click(addVertex());

    expect(onVertex).toHaveBeenCalledOnce();
    const { point, accuracyM } = onVertex.mock.calls[0][0];
    expect(accuracyM).toBe(10);
    expect(point.latitude).toBeCloseTo(7.1, 10);
    // No abrió otra lectura ni quedó esperando: la captura fue inmediata.
    expect(gps.geolocation.watchPosition.mock.calls.length).toBe(watches);
    expect(screen.queryByText(/Capturando GPS/)).not.toBeInTheDocument();
  });

  it('adds one vertex per tap, each one instant', async () => {
    const { gps, onVertex, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Activar GPS' }));
    act(() => gps.reading(8, { latitude: 7.0, longitude: -72.0 }));

    await user.click(addVertex());
    await user.click(addVertex());

    expect(onVertex).toHaveBeenCalledTimes(2);
  });

  it('warns about a weak signal before the vertex is added', async () => {
    const { gps, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Activar GPS' }));

    act(() => gps.reading(93));

    expect(screen.getByText(/Señal débil \(±93 m\)/)).toBeInTheDocument();
  });

  it('turns off and stops reading when asked', async () => {
    const { gps, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Activar GPS' }));
    act(() => gps.reading(12));

    await user.click(screen.getByRole('button', { name: /GPS activo/ }));

    expect(screen.getByRole('button', { name: 'Activar GPS' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(gps.watching()).toBe(0);
  });

  it('explains a denied permission when turning it on', async () => {
    const { gps, user } = setup();

    await user.click(screen.getByRole('button', { name: 'Activar GPS' }));
    act(() => gps.fail(1));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No permitiste acceder a tu ubicación',
    );
    expect(
      screen.getByRole('button', { name: 'Activar GPS' }),
    ).toBeInTheDocument();
  });
});
