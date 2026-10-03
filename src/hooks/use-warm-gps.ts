'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { bestFix, type GpsReading } from '@/lib/geo/gps-fix';
import type { GeoPoint } from '@/types/geo';

import { type GpsAlternatives, gpsMessages } from './use-geolocation';

// Con el GPS encendido de antemano el receptor ya está fijado cuando la persona toca capturar:
// no hay que esperar el arranque en frío, que es lo que más tarda. Una captura toma las lecturas
// de los últimos segundos y las promedia.
export const WARM_WINDOW_MS = 10_000;

export type GpsStatus = 'off' | 'searching' | 'tracking' | 'denied';

export type GpsFix = {
  point: GeoPoint;
  // Metros de error de la mejor lectura reciente; null si el dispositivo no lo informó.
  accuracyM: number | null;
};

type Stamped = GpsReading & { at: number };

const ERROR_ALTERNATIVES: GpsAlternatives = {
  instead:
    'Los vértices que ya capturaste se conservan: sigue dibujando en el mapa.',
  retryInstead: 'sigue dibujando en el mapa',
};

const toFix = (reading: GpsReading): GpsFix => ({
  point: { latitude: reading.latitude, longitude: reading.longitude },
  accuracyM: Number.isFinite(reading.accuracy) ? reading.accuracy : null,
});

// Un GPS que se enciende a voluntad, se queda leyendo y se puede consultar al instante. Vive
// mientras la pantalla esté abierta: al salir se apaga solo, para no gastar batería de más.
export function useWarmGps(alternatives: GpsAlternatives = ERROR_ALTERNATIVES) {
  const { instead, retryInstead } = alternatives;
  const messages = useMemo(
    () => gpsMessages({ instead, retryInstead }),
    [instead, retryInstead],
  );
  const [status, setStatus] = useState<GpsStatus>('off');
  const [fix, setFix] = useState<GpsFix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const readings = useRef<Stamped[]>([]);

  const recent = useCallback((now = Date.now()) => {
    readings.current = readings.current.filter(
      (reading) => now - reading.at <= WARM_WINDOW_MS,
    );
    return readings.current;
  }, []);

  const stop = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation?.clearWatch(watchId.current);
      watchId.current = null;
    }
    readings.current = [];
    setFix(null);
    setStatus('off');
  }, []);

  const start = useCallback(() => {
    if (watchId.current !== null) return;
    if (!navigator.geolocation) {
      setError(messages.unsupported);
      return;
    }
    setError(null);
    setStatus('searching');
    watchId.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        readings.current.push({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: Number.isFinite(coords.accuracy)
            ? coords.accuracy
            : Infinity,
          at: Date.now(),
        });
        const best = bestFix(recent());
        if (best) setFix(toFix(best));
        setStatus('tracking');
      },
      ({ code }) => {
        // Sin permiso no hay nada que esperar; lo demás puede pasar y el GPS seguir buscando.
        if (code === 1) {
          stop();
          setStatus('denied');
          setError(messages.errors[1]);
          return;
        }
        setError(messages.errors[code] ?? messages.fallback);
      },
      { enableHighAccuracy: true, maximumAge: 0 },
    );
  }, [messages, recent, stop]);

  // Al salir de la pantalla no se sigue gastando batería.
  useEffect(
    () => () => {
      if (watchId.current !== null) {
        navigator.geolocation?.clearWatch(watchId.current);
        watchId.current = null;
      }
    },
    [],
  );

  // La mejor posición de los últimos segundos, o null si todavía no hay lecturas recientes (el
  // GPS recién se encendió, o dejó de entregar).
  const snapshot = useCallback((): GpsFix | null => {
    const best = bestFix(recent());
    return best ? toFix(best) : null;
  }, [recent]);

  return {
    status,
    isOn: status === 'searching' || status === 'tracking',
    fix,
    error,
    start,
    stop,
    snapshot,
  };
}

export type WarmGps = ReturnType<typeof useWarmGps>;
