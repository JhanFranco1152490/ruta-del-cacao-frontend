'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { formatGeoPoint } from '@/lib/format/coordinates';
import { bestFix, type GpsReading, improvesAccuracy } from '@/lib/geo/gps-fix';
import type { Coordinates } from '@/types/geo';

// El GPS no entrega la mejor lectura de entrada: la primera suele salir de wifi o antenas, con
// cientos de metros de error, y el satélite tarda en fijarse. Por eso se sigue la posición unos
// segundos y se promedian las mejores lecturas. Pero no se espera de más: se termina cuando ya
// no mejora, y como mucho a los 20 s.
export const GPS_MAX_WAIT_MS = 20_000;
// Sin una mejora de al menos el 10 % en este tiempo, seguir esperando casi nunca ayuda. Cuanto
// más gruesa es la lectura, más se espera: una de cientos de metros sale de wifi o antenas, y el
// satélite todavía puede estar fijándose; una de pocas decenas ya es del GPS y casi no mejora.
export const GPS_STALL_MS = 6_000;
export const GPS_STALL_COARSE_MS = 12_000;
// Desde esta precisión (metros) la lectura se considera gruesa.
export const GPS_COARSE_ACCURACY_M = 50;
// Con esta precisión (en metros) ya no vale la pena esperar más.
export const GPS_GOOD_ACCURACY_M = 10;
// Peor que esto, se avisa y se ofrece repetir o marcar el punto en el mapa.
export const GPS_WEAK_ACCURACY_M = 50;

// Qué hacer cuando el GPS no sirve depende de quien lo usa: la finca ofrece escribir las
// coordenadas; el polígono de una parcela, seguir dibujando en el mapa.
export type GpsAlternatives = {
  // Frase completa que sigue a "no hay ubicación".
  instead: string;
  // Lo que se puede hacer en lugar de reintentar, dentro de "Inténtalo nuevamente o ...".
  retryInstead: string;
};

export const COORDINATES_ALTERNATIVES: GpsAlternatives = {
  instead: 'Escribe las coordenadas o marca el punto en el mapa.',
  retryInstead: 'escribe las coordenadas',
};

export const gpsMessages = ({ instead, retryInstead }: GpsAlternatives) => ({
  errors: {
    1: `No permitiste acceder a tu ubicación. ${instead}`,
    2: `La ubicación no está disponible. ${instead}`,
    3: `La captura de ubicación tardó demasiado. Inténtalo nuevamente o ${retryInstead}.`,
  } as Record<number, string>,
  unsupported: `Este dispositivo no permite capturar la ubicación. ${instead}`,
  fallback: `No fue posible capturar la ubicación. Inténtalo nuevamente o ${retryInstead}.`,
});

export type GpsResult = {
  point: Coordinates;
  // Metros de error que reportó el dispositivo; nulo si no lo informó.
  accuracy: number | null;
};

export function useGeolocation(
  // Recibe el punto y los metros de error que reportó el dispositivo (null si no los informó).
  onCapture: (coordinates: Coordinates, accuracy: number | null) => void,
  alternatives: GpsAlternatives = COORDINATES_ALTERNATIVES,
) {
  const { instead, retryInstead } = alternatives;
  const messages = useMemo(
    () => gpsMessages({ instead, retryInstead }),
    [instead, retryInstead],
  );
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // La mejor precisión de lo que va leyendo, para mostrarla mientras captura.
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [result, setResult] = useState<GpsResult | null>(null);

  const isCapturingRef = useRef(false);
  const watchId = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (stallTimer.current !== null) {
      clearTimeout(stallTimer.current);
      stallTimer.current = null;
    }
    isCapturingRef.current = false;
  }, []);

  // Al salir de la pantalla no se sigue gastando batería ni se escribe en un formulario ya cerrado.
  useEffect(() => stop, [stop]);

  const capture = useCallback(() => {
    if (isCapturingRef.current) return;
    if (!navigator.geolocation) {
      setError(messages.unsupported);
      return;
    }

    isCapturingRef.current = true;
    setIsCapturing(true);
    setError(null);
    setAccuracy(null);
    setResult(null);

    const readings: GpsReading[] = [];
    let bestAccuracy: number | null = null;
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
      const fix = bestFix(readings);
      if (!fix) {
        setError(messages.errors[lastErrorCode] ?? messages.fallback);
        return;
      }
      const point = formatGeoPoint(fix);
      const accuracy = Number.isFinite(fix.accuracy) ? fix.accuracy : null;
      setResult({ point, accuracy });
      onCaptureRef.current(point, accuracy);
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
        readings.push(reading);
        if (Number.isFinite(reading.accuracy)) {
          if (improvesAccuracy(bestAccuracy, reading.accuracy)) {
            bestAccuracy = reading.accuracy;
            setAccuracy(bestAccuracy);
            // Cada mejora reinicia la cuenta: si no llega otra a tiempo, se termina con lo que hay.
            if (stallTimer.current !== null) clearTimeout(stallTimer.current);
            stallTimer.current = setTimeout(
              finish,
              reading.accuracy > GPS_COARSE_ACCURACY_M
                ? GPS_STALL_COARSE_MS
                : GPS_STALL_MS,
            );
          }
          if (reading.accuracy <= GPS_GOOD_ACCURACY_M) finish();
        }
      },
      ({ code }) => {
        // Sin permiso no hay nada que esperar; lo demás puede pasar y el GPS seguir buscando.
        if (code === 1) {
          if (done) return;
          end();
          setError(messages.errors[1]);
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
  }, [stop, messages]);

  return { capture, error, isCapturing, accuracy, result };
}
