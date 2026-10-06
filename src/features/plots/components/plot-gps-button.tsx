'use client';

import { LocateFixed, MapPin } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  GPS_COARSE_ACCURACY_M,
  GPS_GOOD_ACCURACY_M,
  type GpsAlternatives,
  useGeolocation,
} from '@/hooks/use-geolocation';
import type { WarmGps } from '@/hooks/use-warm-gps';
import { parseCoordinates } from '@/lib/format/coordinates';
import type { GeoPoint } from '@/types/geo';

const VERTEX_ALTERNATIVES: GpsAlternatives = {
  instead:
    'Los vértices que ya capturaste se conservan: sigue dibujando en el mapa.',
  retryInstead: 'sigue dibujando en el mapa',
};

type Vertex = { point: GeoPoint; accuracyM: number | null };

// Los controles de GPS del editor. **Activar GPS** lo enciende de antemano: el receptor se fija
// mientras la persona se ubica y se ve su posición en el mapa. **Agregar vértice** captura una
// posición en cada esquina (una por toque, nunca automática): con el GPS encendido toma al
// instante el promedio de los últimos segundos; apagado, lo enciende y espera la primera lectura
// buena, y lo deja encendido para las siguientes esquinas.
export function PlotGpsButton({
  warm,
  disabled,
  onVertex,
}: {
  warm: WarmGps;
  disabled: boolean;
  onVertex: (vertex: Vertex) => void;
}) {
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);
  const [hasCaptured, setHasCaptured] = useState(false);

  const add = (vertex: Vertex) => {
    setHasCaptured(true);
    setLastAccuracy(vertex.accuracyM);
    onVertex(vertex);
  };

  // Para cuando se pide un vértice sin tener lecturas recientes: se espera una buena.
  const capture = useGeolocation((coordinates, accuracy) => {
    const point = parseCoordinates(coordinates);
    if (point) add({ point, accuracyM: accuracy });
  }, VERTEX_ALTERNATIVES);

  const addVertex = () => {
    const recent = warm.isOn ? warm.snapshot() : null;
    if (recent) {
      add(recent);
      return;
    }
    // Se enciende de una vez: las siguientes esquinas serán instantáneas.
    warm.start();
    capture.capture();
  };

  const liveAccuracy = warm.fix?.accuracyM ?? null;
  const isWeakAdded =
    hasCaptured &&
    !capture.isCapturing &&
    lastAccuracy !== null &&
    lastAccuracy > GPS_GOOD_ACCURACY_M;
  const isWeakLive =
    warm.status === 'tracking' &&
    liveAccuracy !== null &&
    liveAccuracy > GPS_COARSE_ACCURACY_M;
  const error = capture.error ?? warm.error;

  return (
    <>
      {/* Destacado por el color cobre, no por el tamaño. */}
      <Button
        disabled={disabled || capture.isCapturing}
        onClick={addVertex}
        size="office"
        type="button"
        variant="copper"
      >
        <MapPin aria-hidden="true" className="size-5" />
        {capture.isCapturing
          ? `Capturando GPS…${
              capture.accuracy === null
                ? ''
                : ` ±${Math.round(capture.accuracy)} m`
            }`
          : 'Agregar vértice'}
      </Button>
      <Button
        aria-pressed={warm.isOn}
        disabled={disabled}
        onClick={warm.isOn ? warm.stop : warm.start}
        size="office"
        type="button"
        variant={warm.isOn ? 'default' : 'outline'}
      >
        <LocateFixed aria-hidden="true" className="size-5" />
        {warm.isOn
          ? `GPS activo${
              liveAccuracy === null
                ? ' · buscando…'
                : ` · ±${Math.round(liveAccuracy)} m`
            }`
          : 'Activar GPS'}
      </Button>
      {warm.status === 'searching' && (
        <p
          className="order-last basis-full text-sm text-muted-foreground"
          role="status"
        >
          Buscando satélites: sigue en un lugar despejado. Con el GPS activo,
          cada vértice se agrega al instante.
        </p>
      )}
      {isWeakLive && (
        <p className="order-last basis-full text-sm font-bold text-warn">
          Señal débil (±{Math.round(liveAccuracy)} m): busca un lugar despejado
          antes de agregar el vértice.
        </p>
      )}
      {capture.isCapturing && (
        <p
          className="order-last basis-full text-sm text-muted-foreground"
          role="status"
        >
          Mantén el celular quieto y a cielo abierto: se promedian varias
          lecturas.
        </p>
      )}
      {hasCaptured &&
        !capture.isCapturing &&
        lastAccuracy !== null &&
        !isWeakAdded && (
          <p
            className="order-last basis-full text-sm text-muted-foreground"
            role="status"
          >
            Vértice agregado con precisión de ±{Math.round(lastAccuracy)} m.
          </p>
        )}
      {isWeakAdded && lastAccuracy !== null && (
        <p className="order-last basis-full font-bold text-warn" role="status">
          Precisión baja (±{Math.round(lastAccuracy)} m): espera unos segundos o
          busca un lugar despejado
        </p>
      )}
      {error && (
        <p className="order-last basis-full font-bold text-err" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
