'use client';

import { cn } from 'cn';
import { ArrowLeft } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';

import { BaseLayerToggle } from './base-layer-toggle';
import type { BaseLayerKind } from './base-layers';
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
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
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
        {hasBaseLayer && (
          <BaseLayerToggle
            onChange={(next) => {
              setBaseLayer(next);
              setBaseLayerMissing(false);
            }}
            value={baseLayer}
          />
        )}
      </div>
      {/* `isolate`: Leaflet apila sus capas con z-index de 400 a 1000; sin encerrarlas, el mapa
          quedaría por encima de los diálogos y del menú móvil (z-50). */}
      <div
        className={cn(
          'isolate overflow-hidden rounded-[var(--radius-card)] border border-border bg-muted',
          MUNICIPALITY_MAP_HEIGHT,
        )}
        data-slot="map-frame"
      >
        <Provider
          baseLayer={baseLayer}
          describeMunicipality={describeMunicipality}
          onBaseLayerUnavailable={() => setBaseLayerMissing(true)}
          onError={map.fail}
          onSelectMunicipality={onSelectMunicipality}
          onSelectPoint={onSelectPoint}
          view={view}
        />
      </div>
      {hasBaseLayer && baseLayerMissing && (
        <p className="text-sm font-bold text-muted-foreground" role="status">
          No cargó el mapa base: se ven solo los límites y las fincas.
        </p>
      )}
      {notice}
    </section>
  );
}
