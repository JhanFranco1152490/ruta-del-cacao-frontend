import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installFakeGps, restoreGeolocation } from '@/test/fake-geolocation';

import { useWarmGps, WARM_WINDOW_MS } from './use-warm-gps';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  restoreGeolocation();
});

const A = { latitude: 7.1, longitude: -72.1 };
const B = { latitude: 7.3, longitude: -72.3 };

describe('useWarmGps', () => {
  it('stays off and asks for nothing until it is turned on', () => {
    const gps = installFakeGps();
    const { result } = renderHook(() => useWarmGps());

    expect(result.current.status).toBe('off');
    expect(result.current.isOn).toBe(false);
    expect(gps.geolocation.watchPosition).not.toHaveBeenCalled();
    expect(result.current.snapshot()).toBeNull();
  });

  it('searches once on, then tracks and shows the live accuracy', () => {
    const gps = installFakeGps();
    const { result } = renderHook(() => useWarmGps());

    act(() => result.current.start());
    expect(result.current.status).toBe('searching');
    act(() => gps.reading(12, A));

    expect(result.current.status).toBe('tracking');
    expect(result.current.fix?.accuracyM).toBe(12);
    expect(result.current.fix?.point.latitude).toBeCloseTo(A.latitude, 10);
    expect(result.current.fix?.point.longitude).toBeCloseTo(A.longitude, 10);
  });

  it('does not start a second watch when turned on twice', () => {
    const gps = installFakeGps();
    const { result } = renderHook(() => useWarmGps());

    act(() => result.current.start());
    act(() => result.current.start());

    expect(gps.geolocation.watchPosition).toHaveBeenCalledOnce();
  });

  it('answers a capture at once with the average of the recent readings', () => {
    const gps = installFakeGps();
    const { result } = renderHook(() => useWarmGps());
    act(() => result.current.start());

    act(() => gps.reading(10, { latitude: 7.0, longitude: -72.0 }));
    act(() => vi.advanceTimersByTime(1000));
    act(() => gps.reading(10, { latitude: 7.2, longitude: -72.2 }));

    const fix = result.current.snapshot()!;
    expect(fix.accuracyM).toBe(10);
    expect(fix.point.latitude).toBeCloseTo(7.1, 10);
    expect(fix.point.longitude).toBeCloseTo(-72.1, 10);
  });

  it('forgets readings older than the window, so a capture never uses a stale position', () => {
    const gps = installFakeGps();
    const { result } = renderHook(() => useWarmGps());
    act(() => result.current.start());
    act(() => gps.reading(10, A));

    act(() => vi.advanceTimersByTime(WARM_WINDOW_MS + 1));

    expect(result.current.snapshot()).toBeNull();
  });

  it('turns off, stops reading and forgets what it had', () => {
    const gps = installFakeGps();
    const { result } = renderHook(() => useWarmGps());
    act(() => result.current.start());
    act(() => gps.reading(10, A));

    act(() => result.current.stop());

    expect(result.current.status).toBe('off');
    expect(result.current.fix).toBeNull();
    expect(result.current.snapshot()).toBeNull();
    expect(gps.watching()).toBe(0);
  });

  it('turns itself off and explains when the permission is denied', () => {
    const gps = installFakeGps();
    const { result } = renderHook(() => useWarmGps());
    act(() => result.current.start());

    act(() => gps.fail(1));

    expect(result.current.status).toBe('denied');
    expect(result.current.isOn).toBe(false);
    expect(result.current.error).toContain(
      'No permitiste acceder a tu ubicación',
    );
    expect(result.current.error).toContain('sigue dibujando en el mapa');
    expect(gps.watching()).toBe(0);
  });

  it('keeps looking after a temporary failure', () => {
    const gps = installFakeGps();
    const { result } = renderHook(() => useWarmGps());
    act(() => result.current.start());

    act(() => gps.fail(2));
    expect(result.current.isOn).toBe(true);
    act(() => gps.reading(15, B));

    expect(result.current.status).toBe('tracking');
    expect(result.current.fix?.point.latitude).toBeCloseTo(B.latitude, 10);
  });

  it('explains when the device has no way to give a position', () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: undefined,
    });
    const { result } = renderHook(() => useWarmGps());

    act(() => result.current.start());

    expect(result.current.error).toContain('no permite capturar la ubicación');
    expect(result.current.isOn).toBe(false);
  });

  it('stops reading when the screen is left', () => {
    const gps = installFakeGps();
    const { result, unmount } = renderHook(() => useWarmGps());
    act(() => result.current.start());
    expect(gps.watching()).toBe(1);

    unmount();

    expect(gps.watching()).toBe(0);
  });
});
