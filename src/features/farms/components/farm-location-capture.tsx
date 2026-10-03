'use client';

import { LocateFixed, MapPin } from 'lucide-react';
import { useState } from 'react';

import { FormMessage } from '@/components/form-message';
import { MapPanel } from '@/components/map/map-panel';
import type {
  GpsPosition,
  LoadMapProvider,
} from '@/components/map/map-provider';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import { loadMapProvider as appMapProvider } from '@/config/map';
import type { Coordinates, GeoBounds } from '@/types/geo';

import {
  GPS_COARSE_ACCURACY_M,
  GPS_WEAK_ACCURACY_M,
  type GpsResult,
  type useGeolocation,
} from '@/hooks/use-geolocation';
import type { WarmGps } from '@/hooks/use-warm-gps';
import { formatGeoPoint } from '@/lib/format/coordinates';
import {
  CAPTURE_BUTTON_CLASS,
  CAPTURE_FIELD_CLASS,
} from '@/components/capture-field-class';

type Geolocation = ReturnType<typeof useGeolocation>;

const WEAK_PRECISION_MESSAGE = (meters: number) =>
  `La precisión es baja (±${Math.round(meters)} m). Sal a un lugar abierto y vuelve a capturar, o marca el punto en el mapa.`;

// Lo que se dice de la precisión de la última captura, solo mientras los campos sigan teniendo ese
// punto: si la persona lo corrigió o lo movió en el mapa, la precisión ya no es de este punto.
function precisionNotes(result: GpsResult | null, location: Coordinates) {
  if (
    !result ||
    result.point.latitude !== location.latitude ||
    result.point.longitude !== location.longitude
  ) {
    return null;
  }
  if (result.accuracy === null) {
    return { text: 'El dispositivo no informó la precisión del GPS.' };
  }
  const meters = Math.round(result.accuracy);
  return {
    text: `Precisión del GPS: ±${meters} m`,
    warning:
      result.accuracy > GPS_WEAK_ACCURACY_M
        ? WEAK_PRECISION_MESSAGE(result.accuracy)
        : undefined,
  };
}

// Coordenadas escritas y captura GPS. El mapa va aparte (FarmLocationMap) para que la pantalla
// pueda ponerlo al lado en escritorio; los dos comparten la misma captura GPS.
export function FarmLocationFields({
  location,
  onLocationChange,
  geolocation,
  warm,
  latitudeError,
  longitudeError,
}: {
  location: Coordinates;
  onLocationChange: (location: Coordinates) => void;
  geolocation: Geolocation;
  // El GPS encendido a voluntad: con él activo, capturar es inmediato.
  warm: WarmGps;
  latitudeError?: string;
  longitudeError?: string;
}) {
  // La captura inmediata con el GPS encendido no pasa por `geolocation`, y su precisión también
  // se cuenta: se guarda aparte hasta que la persona vuelva a capturar de la otra forma.
  const [instant, setInstant] = useState<GpsResult | null>(null);
  const result = instant ?? geolocation.result;
  const notes = precisionNotes(result, location);
  const liveAccuracy = warm.fix?.accuracyM ?? null;
  const isWeakLive =
    warm.status === 'tracking' &&
    liveAccuracy !== null &&
    liveAccuracy > GPS_COARSE_ACCURACY_M;

  const capture = () => {
    const recent = warm.isOn ? warm.snapshot() : null;
    if (recent) {
      const point = formatGeoPoint(recent.point);
      setInstant({ point, accuracy: recent.accuracyM });
      onLocationChange(point);
      return;
    }
    // Se enciende de una vez: la próxima captura será inmediata.
    setInstant(null);
    warm.start();
    geolocation.capture();
  };

  return (
    <section aria-labelledby="farm-location-title" className="space-y-4">
      <div>
        <p className="section-label">Georreferenciación</p>
        <h2 id="farm-location-title" className="mt-1 text-2xl text-selva">
          Ubicación de la finca
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          className={CAPTURE_FIELD_CLASS}
          error={latitudeError}
          inputMode="decimal"
          label="Latitud"
          onChange={(event) =>
            onLocationChange({ ...location, latitude: event.target.value })
          }
          value={location.latitude}
        />
        <TextField
          className={CAPTURE_FIELD_CLASS}
          error={longitudeError}
          inputMode="decimal"
          label="Longitud"
          onChange={(event) =>
            onLocationChange({ ...location, longitude: event.target.value })
          }
          value={location.longitude}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {/* Destacado por el color cobre, no por el tamaño. */}
        <Button
          className={CAPTURE_BUTTON_CLASS}
          disabled={geolocation.isCapturing}
          onClick={capture}
          size="office"
          type="button"
          variant="copper"
        >
          <MapPin aria-hidden="true" className="size-5" />
          {geolocation.isCapturing
            ? `Capturando GPS…${
                geolocation.accuracy === null
                  ? ''
                  : ` ±${Math.round(geolocation.accuracy)} m`
              }`
            : 'Capturar GPS'}
        </Button>
        <Button
          aria-pressed={warm.isOn}
          className={CAPTURE_BUTTON_CLASS}
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
      </div>
      {warm.status === 'searching' && (
        <p className="text-sm text-muted-foreground" role="status">
          Buscando satélites: sigue en un lugar despejado. Con el GPS activo,
          capturar el punto es inmediato y ves tu posición en el mapa.
        </p>
      )}
      {isWeakLive && liveAccuracy !== null && (
        <p className="text-sm font-bold text-warn">
          Señal débil (±{Math.round(liveAccuracy)} m): busca un lugar despejado
          antes de capturar.
        </p>
      )}
      {notes && (
        <p className="text-sm text-muted-foreground" role="status">
          {notes.text}
        </p>
      )}
      <FormMessage>
        {geolocation.error ?? warm.error ?? notes?.warning}
      </FormMessage>
    </section>
  );
}

export function FarmLocationMap({
  location,
  onLocationChange,
  disabled,
  frameClassName,
  focusBounds,
  gpsPosition,
  onRequestGps,
  loadMapProvider = appMapProvider,
}: {
  location: Coordinates;
  onLocationChange: (location: Coordinates) => void;
  // Mientras el GPS captura, el mapa no responde: no compiten por el mismo punto.
  disabled: boolean;
  frameClassName?: string;
  focusBounds?: GeoBounds | null;
  gpsPosition?: GpsPosition | null;
  onRequestGps?: () => void;
  // Sin proveedor configurado no hay mapa: el GPS y las coordenadas escritas bastan.
  loadMapProvider?: LoadMapProvider | null;
}) {
  if (!loadMapProvider) return null;
  return (
    <MapPanel
      disabled={disabled}
      focusBounds={focusBounds}
      gpsPosition={gpsPosition}
      onRequestGps={onRequestGps}
      frameClassName={frameClassName}
      loadProvider={loadMapProvider}
      location={location}
      onLocationChange={onLocationChange}
    />
  );
}
