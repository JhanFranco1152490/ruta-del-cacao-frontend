'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { formatGeoPoint } from '@/lib/format/coordinates';
import type { Coordinates } from '@/types/geo';

// El GPS no entrega la mejor lectura de entrada: la primera suele salir de wifi o antenas, con
// cientos de metros de error, y el satélite tarda en fijarse. Por eso se sigue la posición unos
// segundos y se conserva la de menor error.
export const GPS_MAX_WAIT_MS = 30_000;
// Con esta precisión (en metros) ya no vale la pena esperar más.
export const GPS_GOOD_ACCURACY_M = 10;
// Peor que esto, se avisa y se ofrece repetir o marcar el punto en el mapa.
export const GPS_WEAK_ACCURACY_M = 50;

const LOCATION_ERRORS: Record<number, string> = {
  1: 'No permitiste acceder a tu ubicación. Escribe las coordenadas o marca el punto en el mapa.',
  2: 'La ubicación no está disponible. Escribe las coordenadas o marca el punto en el mapa.',
  3: 'La captura de ubicación tardó demasiado. Inténtalo nuevamente o escribe las coordenadas.',
};

const UNSUPPORTED_MESSAGE =
  'Este dispositivo no permite capturar la ubicación. Escribe las coordenadas o marca el punto en el mapa.';

const FALLBACK_MESSAGE =
  'No fue posible capturar la ubicación. Inténtalo nuevamente o escribe las coordenadas.';

export type GpsResult = {
  point: Coordinates;
  // Metros de error que reportó el dispositivo; nulo si no lo informó.
  accuracy: number | null;
};

type Reading = { latitude: number; longitude: number; accuracy: number };

export function useGeolocation(onCapture: (coordinates: Coordinates) => void) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // La mejor precisión de lo que va leyendo, para mostrarla mientras captura.
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [result, setResult] = useState<GpsResult | null>(null);

  const isCapturingRef = useRef(false);
  const watchId = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCaptureRef = useRef(onCapture);
  useEffect(() => {
    onCaptureRef.current = onCapture;
  });

  const stop = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation?.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    isCapturingRef.current = false;
  }, []);

  // Al salir de la pantalla no se sigue gastando batería ni se escribe en un formulario ya cerrado.
  useEffect(() => stop, [stop]);

  const capture = useCallback(() => {
    if (isCapturingRef.current) return;
    if (!navigator.geolocation) {
      setError(UNSUPPORTED_MESSAGE);
      return;
    }

    isCapturingRef.current = true;
    setIsCapturing(true);
    setError(null);
    setAccuracy(null);
    setResult(null);

    let best: Reading | null = null;
    let lastErrorCode = 3;
    let done = false;

    const end = () => {
      done = true;
      stop();
      setIsCapturing(false);
    };
    const finish = () => {
      if (done) return;
      end();
      if (!best) {
        setError(LOCATION_ERRORS[lastErrorCode] ?? FALLBACK_MESSAGE);
        return;
      }
      const point = formatGeoPoint(best);
      setResult({
        point,
        accuracy: Number.isFinite(best.accuracy) ? best.accuracy : null,
      });
      onCaptureRef.current(point);
    };

    watchId.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        // Una lectura sin precisión solo sirve si no hay otra mejor.
        const reading = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: Number.isFinite(coords.accuracy)
            ? coords.accuracy
            : Infinity,
        };
        if (!best || reading.accuracy < best.accuracy) best = reading;
        if (Number.isFinite(best.accuracy)) setAccuracy(best.accuracy);
        if (best.accuracy <= GPS_GOOD_ACCURACY_M) finish();
      },
      ({ code }) => {
        // Sin permiso no hay nada que esperar; lo demás puede pasar y el GPS seguir buscando.
        if (code === 1) {
          if (done) return;
          end();
          setError(LOCATION_ERRORS[1]);
          return;
        }
        lastErrorCode = code;
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: GPS_MAX_WAIT_MS },
    );
    // Si ya terminó dentro de la propia llamada (una lectura inmediata), el seguimiento quedó sin
    // cerrar porque su identificador aún no existía: se cierra ahora y no se arma el temporizador.
    if (done) {
      stop();
      return;
    }
    timer.current = setTimeout(finish, GPS_MAX_WAIT_MS);
  }, [stop]);

  return { capture, error, isCapturing, accuracy, result };
}
