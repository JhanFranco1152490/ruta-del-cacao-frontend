'use client';

import { Loader2, LocateFixed, MapPinned } from 'lucide-react';
import { useEffect, useEffectEvent, useState } from 'react';

import { Button } from '@/components/ui/button';

import type { MapFocusTarget } from './map-provider';

export type MapFocusProps = {
  // Lo que se nombra en el primer botón: "Ir a la finca", "Ir al punto de la finca".
  farmLabel: string;
  canGoToFarm: boolean;
  hasGps: boolean;
  // Sin él (y sin GPS) no hay forma de saber dónde está la persona: el botón queda deshabilitado.
  onRequestGps?: () => void;
  onFocus: (target: MapFocusTarget) => void;
};

// Los botones para llevar el mapa al punto de la finca o a la posición de la persona, uno sobre
// otro y solo con el símbolo (el nombre accesible y el título dicen qué hará el toque). Sin GPS
// encendido, el segundo pide encenderlo y el mapa va a la posición en cuanto llega la primera
// lectura.
export function MapFocusControls({
  farmLabel,
  canGoToFarm,
  hasGps,
  onRequestGps,
  onFocus,
}: MapFocusProps) {
  // La persona pidió ir a su ubicación sin GPS: se va cuando llegue la primera lectura.
  const [waitingForGps, setWaitingForGps] = useState(false);
  const [hadGps, setHadGps] = useState(hasGps);

  // Si el GPS se apaga, el pedido pendiente se olvida: al volver a encenderlo el mapa no debe
  // saltar solo a la posición. Es estado propio que se ajusta al dibujar, no un efecto.
  if (hasGps !== hadGps) {
    setHadGps(hasGps);
    if (!hasGps) setWaitingForGps(false);
  }

  // Avisar al panel actualiza su estado, así que no puede hacerse mientras se dibuja este
  // componente: va en un efecto. Solo corre cuando cambia `hasGps` o se hace un pedido nuevo, y no
  // cuando el panel crea otro `onFocus` al dibujarse (cada aviso lo redibuja y volvería a avisar).
  const goToPosition = useEffectEvent(() => onFocus('gps'));
  useEffect(() => {
    if (waitingForGps && hasGps) goToPosition();
  }, [waitingForGps, hasGps]);

  const waiting = waitingForGps && !hasGps;
  const gpsLabel = waiting ? 'Buscando tu ubicación…' : 'Ir a mi ubicación';
  const GpsIcon = waiting ? Loader2 : LocateFixed;

  return (
    <div className="pointer-events-auto flex flex-col gap-2">
      <Button
        aria-label={farmLabel}
        className="size-10.5 bg-card shadow-sm"
        disabled={!canGoToFarm}
        onClick={() => onFocus('farm')}
        size="icon"
        title={farmLabel}
        type="button"
        variant="outline"
      >
        <MapPinned aria-hidden="true" className="size-4" />
      </Button>
      <Button
        aria-label={gpsLabel}
        className="size-10.5 bg-card shadow-sm"
        disabled={!hasGps && !onRequestGps}
        onClick={() => {
          if (hasGps) {
            onFocus('gps');
            return;
          }
          setWaitingForGps(true);
          onRequestGps?.();
        }}
        size="icon"
        title={gpsLabel}
        type="button"
        variant="outline"
      >
        <GpsIcon
          aria-hidden="true"
          className={waiting ? 'size-4 animate-spin' : 'size-4'}
        />
      </Button>
    </div>
  );
}
