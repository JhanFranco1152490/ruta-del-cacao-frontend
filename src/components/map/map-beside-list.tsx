'use client';

import { cn } from 'cn';
import type { ReactNode, RefObject } from 'react';

import { type MapVisibility, useMapVisibility } from './use-map-visibility';

// Una lista con su mapa. Con espacio, la lista va a la izquierda y el mapa a la derecha, a la vista
// mientras se recorre; en el celular, la lista primero. Con el mapa oculto, la franja «Mapa oculto»
// queda arriba y la lista toma todo el ancho (`list` recibe `visible` para repartir sus tarjetas en
// más columnas), como en la lista de fincas.
export function MapBesideList({
  mapRef,
  map,
  list,
}: {
  mapRef?: RefObject<HTMLDivElement | null>;
  map: (visibility: MapVisibility) => ReactNode;
  list: (visible: boolean) => ReactNode;
}) {
  const visibility = useMapVisibility(true);
  const { visible } = visibility;
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4',
        visible &&
          'lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:items-start',
      )}
    >
      <div
        className={cn(
          'scroll-mt-6',
          visible ? 'lg:sticky lg:top-20 lg:order-2' : 'order-first',
        )}
        ref={mapRef}
      >
        {map(visibility)}
      </div>
      <div className="lg:order-1">{list(visible)}</div>
    </div>
  );
}
