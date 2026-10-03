import { vi } from 'vitest';

type Watcher = {
  onSuccess: PositionCallback;
  onError?: PositionErrorCallback;
};

const originalGeolocation = Object.getOwnPropertyDescriptor(
  navigator,
  'geolocation',
);

export const restoreGeolocation = () => {
  if (originalGeolocation) {
    Object.defineProperty(navigator, 'geolocation', originalGeolocation);
  } else {
    Reflect.deleteProperty(navigator, 'geolocation');
  }
};

// Un GPS que se afina: cada `reading` es una lectura nueva, con su precisión en metros, que
// llega a todo el que esté siguiendo la posición.
export function installFakeGps() {
  let nextId = 0;
  const watchers = new Map<number, Watcher>();
  const geolocation = {
    watchPosition: vi.fn(
      (onSuccess: PositionCallback, onError?: PositionErrorCallback | null) => {
        nextId += 1;
        watchers.set(nextId, { onSuccess, onError: onError ?? undefined });
        return nextId;
      },
    ),
    clearWatch: vi.fn((id: number) => {
      watchers.delete(id);
    }),
  };
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: geolocation,
  });
  return {
    geolocation,
    watching: () => watchers.size,
    reading(
      accuracy: number | undefined,
      point = { latitude: 7.8234567, longitude: -72.5123456 },
    ) {
      for (const { onSuccess } of [...watchers.values()]) {
        onSuccess({ coords: { ...point, accuracy } } as GeolocationPosition);
      }
    },
    fail(code: number) {
      for (const { onError } of [...watchers.values()]) {
        onError?.({ code } as GeolocationPositionError);
      }
    },
  };
}
