import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useGeolocation } from './use-geolocation';

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

describe('useGeolocation', () => {
  it('sends the captured coordinates and prevents simultaneous requests', () => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });
    const onCapture = vi.fn();
    const { result } = renderHook(() => useGeolocation(onCapture));

    act(() => {
      result.current.capture();
      result.current.capture();
    });

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);

    const onSuccess = getCurrentPosition.mock.calls[0][0] as PositionCallback;
    act(() => {
      onSuccess({
        coords: { latitude: 7.8234567, longitude: -72.5123456 },
      } as GeolocationPosition);
    });

    expect(onCapture).toHaveBeenCalledWith({
      latitude: '7.8234567',
      longitude: '-72.5123456',
    });
    expect(result.current.isCapturing).toBe(false);
  });

  it('explains when the browser does not support location', () => {
    Reflect.deleteProperty(navigator, 'geolocation');
    const { result } = renderHook(() => useGeolocation(vi.fn()));

    act(() => result.current.capture());

    expect(result.current.error).toBe(
      'Este dispositivo no permite capturar la ubicación. Escribe las coordenadas o marca el punto en el mapa.',
    );
  });

  it('explains a denied permission and leaves the form available', () => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });
    const { result } = renderHook(() => useGeolocation(vi.fn()));

    act(() => result.current.capture());
    const onError = getCurrentPosition.mock
      .calls[0][1] as PositionErrorCallback;
    act(() => onError({ code: 1 } as GeolocationPositionError));

    expect(result.current.error).toBe(
      'No permitiste acceder a tu ubicación. Escribe las coordenadas o marca el punto en el mapa.',
    );
    expect(result.current.isCapturing).toBe(false);
  });
});
