'use client';

import { MapPin } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  GPS_GOOD_ACCURACY_M,
  type GpsAlternatives,
  useGeolocation,
} from '@/hooks/use-geolocation';
import { parseCoordinates } from '@/lib/format/coordinates';
import type { GeoPoint } from '@/types/geo';

const VERTEX_ALTERNATIVES: GpsAlternatives = {
  instead:
    'Los vértices que ya capturaste se conservan: sigue dibujando en el mapa.',
  retryInstead: 'sigue dibujando en el mapa',
};

// Captura la posición actual como un vértice del polígono: pensado para el celular, de pie en
// cada esquina de la parcela. Una captura por toque, nunca automática.
export function PlotGpsButton({
  disabled,
  onVertex,
}: {
  disabled: boolean;
  onVertex: (vertex: { point: GeoPoint; accuracyM: number | null }) => void;
}) {
  const gps = useGeolocation((coordinates, accuracy) => {
    const point = parseCoordinates(coordinates);
    if (point) onVertex({ point, accuracyM: accuracy });
  }, VERTEX_ALTERNATIVES);

  const accuracy = gps.result?.accuracy ?? null;
  // Una lectura peor que ±10 m se acepta, pero se avisa: no bloquea.
  const isWeak =
    !gps.isCapturing && accuracy !== null && accuracy > GPS_GOOD_ACCURACY_M;

  return (
    <>
      {/* Destacado por el color cobre, no por el tamaño. */}
      <Button
        disabled={disabled || gps.isCapturing}
        onClick={gps.capture}
        size="office"
        type="button"
        variant="copper"
      >
        <MapPin aria-hidden="true" className="size-5" />
        {gps.isCapturing
          ? `Capturando GPS…${
              gps.accuracy === null ? '' : ` ±${Math.round(gps.accuracy)} m`
            }`
          : 'Agregar vértice'}
      </Button>
      {gps.isCapturing && (
        <p className="basis-full text-sm text-muted-foreground" role="status">
          Mantén el celular quieto y a cielo abierto: se promedian varias
          lecturas.
        </p>
      )}
      {!gps.isCapturing && accuracy !== null && !isWeak && (
        <p className="basis-full text-sm text-muted-foreground" role="status">
          Vértice agregado con precisión de ±{Math.round(accuracy)} m.
        </p>
      )}
      {isWeak && (
        <p className="basis-full font-bold text-warn" role="status">
          Precisión baja (±{Math.round(accuracy)} m): espera unos segundos o
          busca un lugar despejado
        </p>
      )}
      {gps.error && (
        <p className="basis-full font-bold text-err" role="alert">
          {gps.error}
        </p>
      )}
    </>
  );
}
