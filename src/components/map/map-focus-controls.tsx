'use client';

import { LocateFixed, MapPinned } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import type { MapFocusTarget } from './map-provider';

// Los botones para llevar el mapa al punto de la finca o a la posición de la persona. Sin GPS
// encendido, el segundo pide encenderlo y el mapa va a la posición en cuanto llega la primera
// lectura.
export function MapFocusControls({
  farmLabel,
  canGoToFarm,
  hasGps,
  onRequestGps,
  onFocus,
}: {
  // Lo que se nombra en el primer botón: "Ir a la finca", "Ir al punto de la finca".
  farmLabel: string;
  canGoToFarm: boolean;
  hasGps: boolean;
  // Sin él (y sin GPS) no hay forma de saber dónde está la persona: el botón queda deshabilitado.
  onRequestGps?: () => void;
  onFocus: (target: MapFocusTarget) => void;
}) {
  // La persona pidió ir a su ubicación sin GPS: se va cuando llegue la primera lectura.
  const [waitingForGps, setWaitingForGps] = useState(false);

  // Llegó la lectura que se esperaba: se va a la posición. Se resuelve al dibujar y no en un
  // efecto, porque es un estado que se deriva de lo que acaba de cambiar.
  if (waitingForGps && hasGps) {
    setWaitingForGps(false);
    onFocus('gps');
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        disabled={!canGoToFarm}
        onClick={() => onFocus('farm')}
        size="office"
        type="button"
        variant="outline"
      >
        <MapPinned aria-hidden="true" className="size-4" /> {farmLabel}
      </Button>
      <Button
        disabled={!hasGps && !onRequestGps}
        onClick={() => {
          if (hasGps) {
            onFocus('gps');
            return;
          }
          setWaitingForGps(true);
          onRequestGps?.();
        }}
        size="office"
        type="button"
        variant="outline"
      >
        <LocateFixed aria-hidden="true" className="size-4" />
        {waitingForGps ? 'Buscando tu ubicación…' : 'Ir a mi ubicación'}
      </Button>
    </div>
  );
}
