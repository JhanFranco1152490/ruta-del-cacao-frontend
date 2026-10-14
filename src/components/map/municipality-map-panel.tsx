'use client';

import { cn } from 'cn';
import { ArrowLeft } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';

import type { BaseLayerKind } from './base-layers';
import { MapFrame, MapHiddenBar } from './map-frame';
import { MapLevelLegend } from './map-level-legend';
import type {
  LoadMunicipalityMapProvider,
  MunicipalityMapView,
} from './map-provider';
import { MapSkeleton } from './map-states';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { useMapProvider } from './use-map-provider';

export const MUNICIPALITY_MAP_HEIGHT = 'h-64 lg:h-80';

// El departamento por municipios y, al elegir uno, ese municipio; o el mapa libre. Es un apoyo
// visual: la lista que lo acompaña es la forma accesible de recorrer las mismas fincas.
export function MunicipalityMapPanel({
  label,
  title,
  view,
  notice,
  aside,
  legendLabel,
  controls,
  onBack,
  describeMunicipality,
  onSelectMunicipality,
  onSelectPoint,
  loadProvider,
  hiddenOnMobile = false,
}: {
  label: string;
  title: string;
  view: MunicipalityMapView;
  notice?: ReactNode;
  // Junto al mapa del departamento (debajo en celular): resúmenes de lo que el mapa muestra. En los
  // otros niveles el mapa ocupa todo el ancho, que es lo que necesita para recorrerse.
  aside?: ReactNode;
  // Con él, el mapa del departamento lleva una leyenda de sus tonos con este título.
  legendLabel?: string;
  // Controles de quien usa el panel (p. ej. la vista del mapa), después del selector del mapa base.
  controls?: ReactNode;
  onBack: () => void;
  describeMunicipality: (code: string, count: number) => string;
  onSelectMunicipality: (code: string) => void;
  onSelectPoint: (id: string) => void;
  // Referencia estable (una constante de módulo): cambiarla vuelve a cargar el mapa.
  loadProvider: LoadMunicipalityMapProvider;
  // En celular el mapa empieza oculto para que la lista llegue antes; un toque lo muestra. Lo que
  // la persona elige después se respeta.
  hiddenOnMobile?: boolean;
}) {
  const map = useMapProvider(loadProvider);
  const [baseLayer, setBaseLayer] = useState<BaseLayerKind>('map');
  const [baseLayerMissing, setBaseLayerMissing] = useState(false);
  const [baseLayerBackup, setBaseLayerBackup] = useState(false);
  const isDesktop = useIsDesktop();
  const [chosenVisible, setVisible] = useState<boolean>();
  const visible = chosenVisible ?? (hiddenOnMobile ? isDesktop : true);

  if (map.isLoading) return <MapSkeleton className={MUNICIPALITY_MAP_HEIGHT} />;

  if (!map.Provider) {
    return (
      <ErrorState
        message="No fue posible cargar el mapa. La lista sigue disponible."
        onRetry={map.retry}
      />
    );
  }

  const { Provider } = map;
  const inMunicipality = view.level === 'municipality';
  // Solo el nivel del departamento va sin mapa base.
  const hasBaseLayer = view.level !== 'department';
  // El resumen va con el mapa: al ocultar uno se ocultan los dos, y el botón de mostrar vuelve a
  // traer ambos.
  const hasAside = !!aside && view.level === 'department';
  const withAside = hasAside && visible;

  return (
    <section aria-label={label} className="space-y-3">
      <div
        className="flex min-h-11 flex-wrap items-center justify-between gap-3"
        data-slot="map-header"
      >
        <div className="flex items-center gap-3">
          {inMunicipality && (
            <Button
              onClick={onBack}
              size="office"
              type="button"
              variant="outline"
            >
              <ArrowLeft aria-hidden="true" className="size-4" /> Volver a
              municipios
            </Button>
          )}
          <p className="font-bold text-selva">{title}</p>
        </div>
        {controls && (
          <div className="flex flex-wrap items-center gap-3">{controls}</div>
        )}
      </div>
      <div
        className={cn(
          withAside &&
            'grid gap-4 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]',
        )}
      >
        <div className="space-y-3">
          {visible ? (
            <MapFrame
              baseLayer={
                hasBaseLayer
                  ? {
                      value: baseLayer,
                      onChange: (next) => {
                        setBaseLayer(next);
                        setBaseLayerMissing(false);
                        setBaseLayerBackup(false);
                      },
                    }
                  : undefined
              }
              className={MUNICIPALITY_MAP_HEIGHT}
              legend={
                legendLabel && view.level === 'department' ? (
                  <MapLevelLegend
                    label={legendLabel}
                    max={Math.max(0, ...view.counts.map(({ count }) => count))}
                  />
                ) : undefined
              }
              onHide={() => setVisible(false)}
            >
              <Provider
                baseLayer={baseLayer}
                describeMunicipality={describeMunicipality}
                onBaseLayerFallback={() => setBaseLayerBackup(true)}
                onBaseLayerUnavailable={() => setBaseLayerMissing(true)}
                onError={map.fail}
                onSelectMunicipality={onSelectMunicipality}
                onSelectPoint={onSelectPoint}
                view={view}
              />
            </MapFrame>
          ) : (
            <MapHiddenBar
              label={hasAside ? 'Mapa y resumen ocultos' : undefined}
              onShow={() => setVisible(true)}
            />
          )}
          {visible && hasBaseLayer && baseLayerBackup && !baseLayerMissing && (
            <p
              className="text-sm font-bold text-muted-foreground"
              role="status"
            >
              Se muestra el mapa de respaldo: el principal no está disponible.
            </p>
          )}
          {visible && hasBaseLayer && baseLayerMissing && (
            <p
              className="text-sm font-bold text-muted-foreground"
              role="status"
            >
              No cargó el mapa base: se ven solo los límites y las fincas.
            </p>
          )}
        </div>
        {withAside && aside}
      </div>
      {notice}
    </section>
  );
}
