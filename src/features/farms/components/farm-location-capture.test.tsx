import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FarmLocationCapture } from './farm-location-capture';
import type { Coordinates } from '../use-geolocation';

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
}: {
  onLocationChange?: (location: Coordinates) => void;
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
});
