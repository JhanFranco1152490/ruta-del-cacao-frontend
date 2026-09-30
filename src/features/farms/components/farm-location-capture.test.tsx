import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LoadMapProvider } from '@/components/map/map-provider';
import { loadFakeMap } from '@/test/fake-map';
import type { Coordinates } from '@/types/geo';

import { FarmLocationCapture } from './farm-location-capture';

const originalGeolocation = Object.getOwnPropertyDescriptor(
  navigator,
  'geolocation',
);

afterEach(() => {
  if (originalGeolocation) {
    Object.defineProperty(navigator, 'geolocation', originalGeolocation);
  } else {
    Reflect.deleteProperty(navigator, 'geolocation');
  }
});

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

  return (
    <FarmLocationCapture
      loadMapProvider={loadMapProvider}
      location={location}
      onLocationChange={handleLocationChange}
    />
  );
}

describe('FarmLocationCapture', () => {
  it('keeps coordinate fields editable and asks for GPS only after a click', async () => {
    const user = userEvent.setup();
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });
    const onLocationChange = vi.fn();

    render(<Harness onLocationChange={onLocationChange} />);

    await user.type(screen.getByLabelText('Latitud'), '7.8');
    expect(onLocationChange).toHaveBeenLastCalledWith({
      latitude: '7.8',
      longitude: '',
    });
    expect(getCurrentPosition).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Capturar GPS' }));
    expect(getCurrentPosition).toHaveBeenCalledOnce();
  });

  it('shows the GPS error without hiding manual entry', async () => {
    const user = userEvent.setup();
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });

    render(
      <FarmLocationCapture
        location={{ latitude: '', longitude: '' }}
        onLocationChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Capturar GPS' }));
    const onError = getCurrentPosition.mock
      .calls[0][1] as PositionErrorCallback;
    onError({ code: 1 } as GeolocationPositionError);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No permitiste acceder a tu ubicación.',
    );
    expect(screen.getByLabelText('Latitud')).toBeEnabled();
    expect(screen.getByLabelText('Longitud')).toBeEnabled();
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
});
