'use client';

import { useCallback, useRef, useState } from 'react';

export type Coordinates = {
  latitude: string;
  longitude: string;
};

const LOCATION_ERRORS: Record<number, string> = {
  1: 'No permitiste acceder a tu ubicación. Escribe las coordenadas o marca el punto en el mapa.',
  2: 'La ubicación no está disponible. Escribe las coordenadas o marca el punto en el mapa.',
  3: 'La captura de ubicación tardó demasiado. Inténtalo nuevamente o escribe las coordenadas.',
};

const UNSUPPORTED_MESSAGE =
  'Este dispositivo no permite capturar la ubicación. Escribe las coordenadas o marca el punto en el mapa.';

export function useGeolocation(onCapture: (coordinates: Coordinates) => void) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCapturingRef = useRef(false);

  const capture = useCallback(() => {
    if (isCapturingRef.current) return;
    if (!navigator.geolocation) {
      setError(UNSUPPORTED_MESSAGE);
      return;
    }

    isCapturingRef.current = true;
    setIsCapturing(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        isCapturingRef.current = false;
        setIsCapturing(false);
        onCapture({
          latitude: String(coords.latitude),
          longitude: String(coords.longitude),
        });
      },
      ({ code }) => {
        isCapturingRef.current = false;
        setIsCapturing(false);
        setError(
          LOCATION_ERRORS[code] ??
            'No fue posible capturar la ubicación. Inténtalo nuevamente o escribe las coordenadas.',
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }, [onCapture]);

  return { capture, error, isCapturing };
}
