'use client';

import { ArrowLeft } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';

import type { BaseLayerKind } from './base-layers';
import { MapFrame, MapHiddenBar } from './map-frame';
import type {
  LoadMunicipalityMapProvider,
  MunicipalityMapView,
} from './map-provider';
import { MapSkeleton } from './map-states';
import { useMapProvider } from './use-map-provider';

export const MUNICIPALITY_MAP_HEIGHT = 'h-80 lg:h-[28rem]';

// El departamento por municipios y, al elegir uno, ese municipio; o el mapa libre. Es un apoyo
// visual: la lista que lo acompaña es la forma accesible de recorrer las mismas fincas.
export function MunicipalityMapPanel({
  label,
  title,
  view,
  notice,
  controls,
  onBack,
  describeMunicipality,
  onSelectMunicipality,
  onSelectPoint,
  loadProvider,
}: {
  label: string;
  title: string;
  view: MunicipalityMapView;
  notice?: ReactNode;
  // Controles de quien usa el panel (p. ej. la vista del mapa), después del selector del mapa base.
  controls?: ReactNode;
  onBack: () => void;
  describeMunicipality: (code: string, count: number) => string;
  onSelectMunicipality: (code: string) => void;
  onSelectPoint: (id: string) => void;
  // Referencia estable (una constante de módulo): cambiarla vuelve a cargar el mapa.
  loadProvider: LoadMunicipalityMapProvider;
}) {
  const map = useMapProvider(loadProvider);
  const [baseLayer, setBaseLayer] = useState<BaseLayerKind>('map');
  const [baseLayerMissing, setBaseLayerMissing] = useState(false);
  const [baseLayerBackup, setBaseLayerBackup] = useState(false);
  const [visible, setVisible] = useState(true);

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
        <MapHiddenBar onShow={() => setVisible(true)} />
      )}
      {visible && hasBaseLayer && baseLayerBackup && !baseLayerMissing && (
        <p className="text-sm font-bold text-muted-foreground" role="status">
          Se muestra el mapa de respaldo: el principal no está disponible.
        </p>
      )}
      {visible && hasBaseLayer && baseLayerMissing && (
        <p className="text-sm font-bold text-muted-foreground" role="status">
          No cargó el mapa base: se ven solo los límites y las fincas.
        </p>
      )}
      {notice}
    </section>
  );
}
