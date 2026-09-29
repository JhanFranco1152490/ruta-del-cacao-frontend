'use client';

import { MapPin } from 'lucide-react';

import { FormMessage } from '@/components/form-message';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import type { Coordinates } from '@/types/geo';

import { useGeolocation } from '../use-geolocation';
import { CAPTURE_FIELD_CLASS } from './capture-field-class';

export function FarmLocationCapture({
  location,
  onLocationChange,
  latitudeError,
  longitudeError,
}: {
  location: Coordinates;
  onLocationChange: (location: Coordinates) => void;
  latitudeError?: string;
  longitudeError?: string;
}) {
  const geolocation = useGeolocation(onLocationChange);

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
      <Button
        className="w-full sm:w-auto"
        disabled={geolocation.isCapturing}
        onClick={geolocation.capture}
        size="field"
        type="button"
        variant="copper"
      >
        <MapPin aria-hidden="true" className="size-6" />
        {geolocation.isCapturing ? 'Capturando GPS…' : 'Capturar GPS'}
      </Button>
      <FormMessage>{geolocation.error ?? undefined}</FormMessage>
    </section>
  );
}
