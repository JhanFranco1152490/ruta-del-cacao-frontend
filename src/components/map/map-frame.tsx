'use client';

import { cn } from 'cn';
import { type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { BaseLayerToggle } from './base-layer-toggle';
import type { BaseLayerKind } from './base-layers';
import { MapFocusControls, type MapFocusProps } from './map-focus-controls';
import { MapExpandButton } from './map-expand-button';
import { MapVisibilityButton } from './map-visibility-button';

// El recuadro del mapa con sus controles encima, arriba a la derecha: así no hace falta una fila
// de botones sobre el mapa y todo el alto de la pantalla es mapa. El zoom queda arriba a la
// izquierda y la atribución abajo a la derecha, y los controles no pasan de la mitad derecha del
// borde superior, así que no los tapan. `isolate`: Leaflet apila sus capas con z-index de 400 a
// 1000; sin encerrarlas, el mapa quedaría por encima de los diálogos y del menú móvil (z-50), y
// los controles necesitan estar por encima de ellas.
export function MapFrame({
  className,
  children,
  baseLayer,
  focus,
  legend,
  onHide,
  expandable = false,
}: {
  className?: string;
  children: ReactNode;
  // El mapa base. Sin él (el nivel del departamento va sin mapa base) no hay selector.
  baseLayer?: {
    value: BaseLayerKind;
    onChange: (value: BaseLayerKind) => void;
  };
  // Llevar el mapa al punto de la finca o a la posición de la persona.
  focus?: MapFocusProps;
  // Abajo a la izquierda, donde no tapa los controles ni la atribución.
  legend?: ReactNode;
  onHide: () => void;
  // Ofrece ver el mapa a pantalla completa: solo donde el mapa es lo único que se trabaja (los
  // editores tienen sus botones fuera del recuadro y quedarían tapados).
  expandable?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  // Leaflet mide su contenedor al crearse y al cambiar el tamaño de la ventana: avisarle así de que
  // el recuadro cambió de tamaño evita que dependa del proveedor del mapa. Con el mapa a pantalla
  // completa la página no se desplaza y Esc lo cierra.
  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [expanded]);

  const frame = (
    <div
      className={cn(
        'relative isolate overflow-hidden bg-muted',
        expanded
          ? 'fixed inset-0 z-[2000] h-dvh w-screen'
          : 'h-full rounded-[var(--radius-card)] border border-border',
      )}
      data-slot="map-frame"
      data-expanded={expanded || undefined}
    >
      {children}
      {/* `pointer-events-none` en el contenedor: los huecos entre botones dejan pasar el toque al
          mapa, que se sigue pudiendo arrastrar. */}
      <div
        className="pointer-events-none absolute top-2 right-2 z-[1100] flex flex-col items-end gap-2"
        data-slot="map-overlay"
      >
        <div className="pointer-events-auto flex items-center gap-2">
          {baseLayer && (
            <BaseLayerToggle
              compact
              onChange={baseLayer.onChange}
              value={baseLayer.value}
            />
          )}
          {expandable && (
            <MapExpandButton
              expanded={expanded}
              onToggle={() => setExpanded((value) => !value)}
            />
          )}
          {!expanded && <MapVisibilityButton onToggle={onHide} visible />}
        </div>
        {focus && <MapFocusControls {...focus} />}
      </div>
      {legend && (
        <div className="pointer-events-auto absolute bottom-3 left-3 z-[1100]">
          {legend}
        </div>
      )}
    </div>
  );

  // A pantalla completa el recuadro sale a `body`: dentro de la página un contenedor fijo (sticky)
  // encierra sus capas en su propio orden de apilado y la cabecera quedaría por encima.
  // El contenedor de afuera guarda el lugar del recuadro mientras tanto.
  return (
    <div className={className}>
      {expanded ? createPortal(frame, document.body) : frame}
    </div>
  );
}

// Lo que queda donde estaba el mapa cuando se oculta: dice que existe y cómo volver a verlo.
export function MapHiddenBar({
  onShow,
  label = 'Mapa oculto',
}: {
  onShow: () => void;
  // Lo que se oculta junto con el mapa, si es más que el mapa («Mapa y resumen ocultos»).
  label?: string;
}) {
  return (
    <div
      className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-card)] border border-dashed border-border bg-card px-4"
      data-slot="map-hidden"
    >
      <p className="text-sm font-bold text-muted-foreground">{label}</p>
      <MapVisibilityButton onToggle={onShow} visible={false} />
    </div>
  );
}
