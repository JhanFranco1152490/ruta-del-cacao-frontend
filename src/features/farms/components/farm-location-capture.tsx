'use client';

import { MapPin } from 'lucide-react';

import { FormMessage } from '@/components/form-message';
import { MapPanel } from '@/components/map/map-panel';
import type { LoadMapProvider } from '@/components/map/map-provider';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import { loadMapProvider as appMapProvider } from '@/config/map';
import type { Coordinates, GeoBounds } from '@/types/geo';

import type { useGeolocation } from '../use-geolocation';
import {
  CAPTURE_BUTTON_CLASS,
  CAPTURE_FIELD_CLASS,
} from './capture-field-class';

type Geolocation = ReturnType<typeof useGeolocation>;

// Coordenadas escritas y captura GPS. El mapa va aparte (FarmLocationMap) para que la pantalla
// pueda ponerlo al lado en escritorio; los dos comparten la misma captura GPS.
export function FarmLocationFields({
  location,
  onLocationChange,
  geolocation,
  latitudeError,
  longitudeError,
}: {
  location: Coordinates;
  onLocationChange: (location: Coordinates) => void;
  geolocation: Geolocation;
  latitudeError?: string;
  longitudeError?: string;
}) {
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
      {/* Destacado por el color cobre, no por el tamaño. */}
      <Button
        className={CAPTURE_BUTTON_CLASS}
        disabled={geolocation.isCapturing}
        onClick={geolocation.capture}
        size="office"
        type="button"
        variant="copper"
      >
        <MapPin aria-hidden="true" className="size-5" />
        {geolocation.isCapturing ? 'Capturando GPS…' : 'Capturar GPS'}
      </Button>
      <FormMessage>{geolocation.error ?? undefined}</FormMessage>
    </section>
  );
}

export function FarmLocationMap({
  location,
  onLocationChange,
  disabled,
  frameClassName,
  focusBounds,
  loadMapProvider = appMapProvider,
}: {
  location: Coordinates;
  onLocationChange: (location: Coordinates) => void;
  // Mientras el GPS captura, el mapa no responde: no compiten por el mismo punto.
  disabled: boolean;
  frameClassName?: string;
  focusBounds?: GeoBounds | null;
  // Sin proveedor configurado no hay mapa: el GPS y las coordenadas escritas bastan.
  loadMapProvider?: LoadMapProvider | null;
}) {
  if (!loadMapProvider) return null;
  return (
    <MapPanel
      disabled={disabled}
      focusBounds={focusBounds}
      frameClassName={frameClassName}
      loadProvider={loadMapProvider}
      location={location}
      onLocationChange={onLocationChange}
    />
  );
}
