import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installFakeGps, restoreGeolocation } from '@/test/fake-geolocation';

import {
  GPS_GOOD_ACCURACY_M,
  GPS_MAX_WAIT_MS,
  useGeolocation,
} from './use-geolocation';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  restoreGeolocation();
});

const A = { latitude: 7.1, longitude: -72.1 };
const B = { latitude: 7.2, longitude: -72.2 };
const C = { latitude: 7.3, longitude: -72.3 };

describe('useGeolocation', () => {
  it('follows the position and keeps the most precise reading when the time is up', () => {
    const gps = installFakeGps();
    const onCapture = vi.fn();
    const { result } = renderHook(() => useGeolocation(onCapture));

    act(() => result.current.capture());
    act(() => gps.reading(120, A));
    act(() => gps.reading(40, B));
    act(() => gps.reading(80, C));
    expect(onCapture).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(GPS_MAX_WAIT_MS));

    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(onCapture).toHaveBeenCalledWith({
      latitude: '7.2000000',
      longitude: '-72.2000000',
    });
    expect(result.current.result?.accuracy).toBe(40);
    expect(result.current.isCapturing).toBe(false);
    expect(gps.watching()).toBe(0);
  });

  it('stops at once when a reading is precise enough', () => {
    const gps = installFakeGps();
    const onCapture = vi.fn();
    const { result } = renderHook(() => useGeolocation(onCapture));

    act(() => result.current.capture());
    act(() => gps.reading(35, A));
    act(() => gps.reading(GPS_GOOD_ACCURACY_M, B));

    expect(onCapture).toHaveBeenCalledWith({
      latitude: '7.2000000',
      longitude: '-72.2000000',
    });
    expect(result.current.result?.accuracy).toBe(GPS_GOOD_ACCURACY_M);
    expect(gps.watching()).toBe(0);
  });

  it('shows the best accuracy so far while it is still capturing', () => {
    const gps = installFakeGps();
    const { result } = renderHook(() => useGeolocation(vi.fn()));

    act(() => result.current.capture());
    act(() => gps.reading(90, A));
    act(() => gps.reading(35, B));
    act(() => gps.reading(60, C));

    expect(result.current.isCapturing).toBe(true);
    expect(result.current.accuracy).toBe(35);
  });

  it('asks for the best reading the device can give, never a stored one', () => {
    const gps = installFakeGps();
    const { result } = renderHook(() => useGeolocation(vi.fn()));

    act(() => result.current.capture());

    expect(gps.geolocation.watchPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { enableHighAccuracy: true, maximumAge: 0, timeout: GPS_MAX_WAIT_MS },
    );
  });

  it('prevents simultaneous requests', () => {
    const gps = installFakeGps();
    const { result } = renderHook(() => useGeolocation(vi.fn()));

    act(() => {
      result.current.capture();
      result.current.capture();
    });

    expect(gps.geolocation.watchPosition).toHaveBeenCalledTimes(1);
  });

  it('rounds the captured point to the precision the API stores', () => {
    const gps = installFakeGps();
    const onCapture = vi.fn();
    const { result } = renderHook(() => useGeolocation(onCapture));

    act(() => result.current.capture());
    act(() => gps.reading(5, { latitude: 7.823456789123, longitude: -72.51 }));

    expect(onCapture).toHaveBeenCalledWith({
      latitude: '7.8234568',
      longitude: '-72.5100000',
    });
  });

  it('captures once and leaves nothing running when the reading comes back at once', () => {
    const gps = installFakeGps();
    gps.geolocation.watchPosition.mockImplementation((onSuccess) => {
      onSuccess({
        coords: { ...A, accuracy: 4 },
      } as GeolocationPosition);
      return 7;
    });
    const onCapture = vi.fn();
    const { result } = renderHook(() => useGeolocation(onCapture));

    act(() => result.current.capture());
    act(() => vi.advanceTimersByTime(GPS_MAX_WAIT_MS));

    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(gps.geolocation.clearWatch).toHaveBeenCalledWith(7);
    expect(result.current.isCapturing).toBe(false);
  });

  it('forgets the previous result when a new capture starts', () => {
    const gps = installFakeGps();
    const { result } = renderHook(() => useGeolocation(vi.fn()));
    act(() => result.current.capture());
    act(() => gps.reading(5, A));
    expect(result.current.result).not.toBeNull();

    act(() => result.current.capture());

    expect(result.current.result).toBeNull();
    expect(result.current.accuracy).toBeNull();
  });

  it('keeps going through a passing error and still captures', () => {
    const gps = installFakeGps();
    const onCapture = vi.fn();
    const { result } = renderHook(() => useGeolocation(onCapture));

    act(() => result.current.capture());
    act(() => gps.fail(2));
    act(() => gps.reading(8, A));

    expect(result.current.error).toBeNull();
    expect(onCapture).toHaveBeenCalledTimes(1);
  });

  it('captures what it has when the time is up even if the last answer was an error', () => {
    const gps = installFakeGps();
    const onCapture = vi.fn();
    const { result } = renderHook(() => useGeolocation(onCapture));

    act(() => result.current.capture());
    act(() => gps.reading(70, A));
    act(() => gps.fail(3));
    act(() => vi.advanceTimersByTime(GPS_MAX_WAIT_MS));

    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('explains the time ran out when no reading ever arrived', () => {
    installFakeGps();
    const { result } = renderHook(() => useGeolocation(vi.fn()));

    act(() => result.current.capture());
    act(() => vi.advanceTimersByTime(GPS_MAX_WAIT_MS));

    expect(result.current.error).toBe(
      'La captura de ubicación tardó demasiado. Inténtalo nuevamente o escribe las coordenadas.',
    );
    expect(result.current.isCapturing).toBe(false);
  });

  it('says the location is unavailable when that was the last thing the device said', () => {
    const gps = installFakeGps();
    const { result } = renderHook(() => useGeolocation(vi.fn()));

    act(() => result.current.capture());
    act(() => gps.fail(2));
    act(() => vi.advanceTimersByTime(GPS_MAX_WAIT_MS));

    expect(result.current.error).toBe(
      'La ubicación no está disponible. Escribe las coordenadas o marca el punto en el mapa.',
    );
  });

  it('stops at once and explains a denied permission', () => {
    const gps = installFakeGps();
    const { result } = renderHook(() => useGeolocation(vi.fn()));

    act(() => result.current.capture());
    act(() => gps.fail(1));

    expect(result.current.error).toBe(
      'No permitiste acceder a tu ubicación. Escribe las coordenadas o marca el punto en el mapa.',
    );
    expect(result.current.isCapturing).toBe(false);
    expect(gps.watching()).toBe(0);
  });

  it('explains when the browser does not support location', () => {
    Reflect.deleteProperty(navigator, 'geolocation');
    const { result } = renderHook(() => useGeolocation(vi.fn()));

    act(() => result.current.capture());

    expect(result.current.error).toBe(
      'Este dispositivo no permite capturar la ubicación. Escribe las coordenadas o marca el punto en el mapa.',
    );
  });

  it('stops following the position when the screen goes away', () => {
    const gps = installFakeGps();
    const onCapture = vi.fn();
    const { result, unmount } = renderHook(() => useGeolocation(onCapture));
    act(() => result.current.capture());
    expect(gps.watching()).toBe(1);

    unmount();
    act(() => vi.advanceTimersByTime(GPS_MAX_WAIT_MS));

    expect(gps.watching()).toBe(0);
    expect(onCapture).not.toHaveBeenCalled();
  });

  it('still captures a reading that carries no accuracy, as a last resort', () => {
    const gps = installFakeGps();
    const onCapture = vi.fn();
    const { result } = renderHook(() => useGeolocation(onCapture));

    act(() => result.current.capture());
    act(() => gps.reading(undefined, A));
    act(() => vi.advanceTimersByTime(GPS_MAX_WAIT_MS));

    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(result.current.result?.accuracy).toBeNull();
  });
});
