import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LoadMapProvider } from '@/components/map/map-provider';
import { installFakeGps, restoreGeolocation } from '@/test/fake-geolocation';
import { loadFakeMap } from '@/test/fake-map';
import type { Coordinates } from '@/types/geo';

import { useGeolocation } from '../use-geolocation';
import { FarmLocationFields, FarmLocationMap } from './farm-location-capture';

afterEach(restoreGeolocation);

function Harness({
  onLocationChange,
  loadMapProvider = null,
}: {
  onLocationChange?: (location: Coordinates) => void;
  loadMapProvider?: LoadMapProvider | null;
}) {
  const [location, setLocation] = useState<Coordinates>({
    latitude: '',
    longitude: '',
  });
  const handleLocationChange = (nextLocation: Coordinates) => {
    setLocation(nextLocation);
    onLocationChange?.(nextLocation);
  };

  // Igual que el formulario: los campos y el mapa comparten la misma captura GPS.
  const geolocation = useGeolocation(handleLocationChange);

  return (
    <>
      <FarmLocationFields
        geolocation={geolocation}
        location={location}
        onLocationChange={handleLocationChange}
      />
      <FarmLocationMap
        disabled={geolocation.isCapturing}
        loadMapProvider={loadMapProvider}
        location={location}
        onLocationChange={handleLocationChange}
      />
    </>
  );
}

describe('farm location capture', () => {
  it('keeps coordinate fields editable and asks for GPS only after a click', async () => {
    const user = userEvent.setup();
    const gps = installFakeGps();
    const onLocationChange = vi.fn();

    render(<Harness onLocationChange={onLocationChange} />);

    await user.type(screen.getByLabelText('Latitud'), '7.8');
    expect(onLocationChange).toHaveBeenLastCalledWith({
      latitude: '7.8',
      longitude: '',
    });
    expect(gps.geolocation.watchPosition).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Capturar GPS' }));
    expect(gps.geolocation.watchPosition).toHaveBeenCalledOnce();
  });

  it('shows the GPS error without hiding manual entry', async () => {
    const user = userEvent.setup();
    const gps = installFakeGps();

    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Capturar GPS' }));
    act(() => gps.fail(1));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No permitiste acceder a tu ubicación.',
    );
    expect(screen.getByLabelText('Latitud')).toBeEnabled();
    expect(screen.getByLabelText('Longitud')).toBeEnabled();
  });

  describe('GPS precision', () => {
    async function capture(accuracy: number) {
      const user = userEvent.setup();
      const gps = installFakeGps();
      render(<Harness />);
      await user.click(screen.getByRole('button', { name: 'Capturar GPS' }));
      return { user, gps, reading: () => act(() => gps.reading(accuracy)) };
    }

    it('shows the best precision on the button while it keeps reading', async () => {
      const { reading } = await capture(35);

      reading();

      expect(
        screen.getByRole('button', { name: 'Capturando GPS… ±35 m' }),
      ).toBeDisabled();
    });

    it('tells the precision of the captured point', async () => {
      const { reading } = await capture(8);

      reading();

      expect(await screen.findByRole('status')).toHaveTextContent(
        'Precisión del GPS: ±8 m',
      );
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('warns when the precision is poor and offers the alternatives', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const { gps } = await capture(80);
        act(() => gps.reading(80));
        act(() => vi.advanceTimersByTime(30_000));
      } finally {
        vi.useRealTimers();
      }

      expect(await screen.findByRole('status')).toHaveTextContent(
        'Precisión del GPS: ±80 m',
      );
      expect(screen.getByRole('alert')).toHaveTextContent(
        'La precisión es baja',
      );
      expect(screen.getByRole('alert')).toHaveTextContent('vuelve a capturar');
      expect(screen.getByRole('alert')).toHaveTextContent(
        'marca el punto en el mapa',
      );
    });

    it('says so when the device does not report the precision', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const { gps } = await capture(8);
        act(() => gps.reading(undefined));
        act(() => vi.advanceTimersByTime(30_000));
      } finally {
        vi.useRealTimers();
      }

      expect(await screen.findByRole('status')).toHaveTextContent(
        'El dispositivo no informó la precisión del GPS.',
      );
    });

    it('stops talking about the precision once the person edits the point', async () => {
      const { user, reading } = await capture(8);
      reading();
      await screen.findByRole('status');

      await user.type(screen.getByLabelText('Latitud'), '1');

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('shows no map while no provider is configured', () => {
    render(<Harness />);

    expect(
      screen.queryByRole('region', { name: 'Mapa de ubicación' }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Latitud')).toBeInTheDocument();
  });

  it('keeps the map marker and the coordinate fields in step', async () => {
    const user = userEvent.setup();
    render(<Harness loadMapProvider={loadFakeMap} />);

    await user.click(
      await screen.findByRole('button', { name: 'Tocar el mapa' }),
    );
    expect(screen.getByLabelText('Latitud')).toHaveValue('7.1234568');
    expect(screen.getByLabelText('Longitud')).toHaveValue('-72.5000000');

    await user.clear(screen.getByLabelText('Latitud'));
    await user.type(screen.getByLabelText('Latitud'), '8.5');
    expect(screen.getByText('Marcador: 8.5, -72.5')).toBeInTheDocument();
  });

  it('keeps the map still while the GPS is capturing', async () => {
    const user = userEvent.setup();
    installFakeGps();
    render(<Harness loadMapProvider={loadFakeMap} />);

    await user.click(screen.getByRole('button', { name: 'Capturar GPS' }));

    expect(
      await screen.findByRole('button', { name: 'Tocar el mapa' }),
    ).toBeDisabled();
  });
});
