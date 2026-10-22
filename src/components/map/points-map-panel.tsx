'use client';

import { type ReactNode, useState } from 'react';

import type { BaseLayerKind } from './base-layers';
import { MapFrame, MapHiddenBar } from './map-frame';
import type { LoadPointsMapProvider, MapPoint, MapShape } from './map-provider';
import { mapPlaceholder } from './map-states';
import { type MapVisibility, useMapVisibility } from './use-map-visibility';
import { useMapProvider } from './use-map-provider';

// Mapa de consulta con varios puntos. Es un apoyo visual: la lista que lo acompaña sigue
// siendo la forma accesible de recorrer los mismos datos.
export function PointsMapPanel({
  label,
  points,
  shapes = [],
  focus,
  onSelectShape,
  emptyMessage,
  toolbar,
  loadProvider,
  heightClassName = 'h-64 md:h-80',
  hiddenOnMobile = false,
  visibility,
}: {
  label: string;
  points: readonly MapPoint[];
  shapes?: readonly MapShape[];
  focus?: { shapeId: string };
  onSelectShape?: (id: string) => void;
  emptyMessage: string;
  // Lo que acompaña a los controles del mapa, a su izquierda (p. ej. un total). Se ve aunque el
  // mapa esté oculto o no haya cargado.
  toolbar?: ReactNode;
  // Referencia estable (una constante de módulo): cambiarla vuelve a cargar el mapa.
  loadProvider: LoadPointsMapProvider;
  heightClassName?: string;
  // En el celular el mapa empieza oculto y la lista queda más arriba; pedir una forma (`focus`) lo
  // vuelve a mostrar.
  hiddenOnMobile?: boolean;
  // Quien dibuja la lista de al lado lo comparte (`MapBesideList`); sin él, el panel lo lleva solo.
  visibility?: MapVisibility;
}) {
  const map = useMapProvider(loadProvider);
  const [baseLayer, setBaseLayer] = useState<BaseLayerKind>('map');
  const own = useMapVisibility(hiddenOnMobile);
  const { visible, setVisible } = visibility ?? own;
  const [shownFocus, setShownFocus] = useState(focus);
  if (focus !== shownFocus) {
    setShownFocus(focus);
    if (focus) setVisible(true);
  }

  const { Provider } = map;
  const placeholder = mapPlaceholder(map, {
    className: heightClassName,
    failureMessage:
      'No fue posible cargar el mapa. La lista de abajo sigue disponible.',
  });
  // Con el mapa oculto, el total va dentro de la franja «Mapa oculto» y no en una fila aparte.
  const toolbarInBar = !visible && !map.isLoading && !!Provider;

  return (
    <section aria-label={label} className="space-y-2">
      {toolbar && !toolbarInBar && <div>{toolbar}</div>}
      {placeholder || !Provider ? (
        placeholder
      ) : (
        <>
          {visible ? (
            <MapFrame
              expandable
              baseLayer={{ value: baseLayer, onChange: setBaseLayer }}
              className={heightClassName}
              onHide={() => setVisible(false)}
            >
              <Provider
                baseLayer={baseLayer}
                focus={focus}
                onError={map.fail}
                onSelectShape={onSelectShape}
                points={points}
                shapes={shapes}
              />
            </MapFrame>
          ) : (
            <MapHiddenBar onShow={() => setVisible(true)} summary={toolbar} />
          )}
          {visible && points.length === 0 && shapes.length === 0 && (
            <p className="text-sm font-bold text-muted-foreground">
              {emptyMessage}
            </p>
          )}
        </>
      )}
    </section>
  );
}
