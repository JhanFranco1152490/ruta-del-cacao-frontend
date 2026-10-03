'use client';

import { useState } from 'react';

import { ErrorState } from '@/components/error-state';
import type {
  LoadMunicipalityMapProvider,
  MapFocus,
  MunicipalityMapView,
} from '@/components/map/map-provider';
import { MapSkeleton } from '@/components/map/map-states';
import {
  MUNICIPALITY_MAP_HEIGHT,
  MunicipalityMapPanel,
} from '@/components/map/municipality-map-panel';
import { SegmentedControl } from '@/components/segmented-control';
import { loadMunicipalityMapProvider as appMunicipalityMap } from '@/config/map';
import { formatDateTime } from '@/lib/format/dates';

import type { FarmListItem } from '../farm-list-item';
import { farmMapPoints, withLocalCounts } from '../farm-map-data';
import {
  type FarmMapQuery,
  useFarmMapPoints,
  useFarmMunicipalityCounts,
} from '../map-api';
import type { FarmMapMode } from '../use-farm-map-mode';

const MODE_OPTIONS = [
  { value: 'municipalities', label: 'Por municipios' },
  { value: 'free', label: 'Libre' },
] as const satisfies readonly { value: FarmMapMode; label: string }[];

const farmsLabel = (count: number) =>
  `${count} ${count === 1 ? 'finca' : 'fincas'}`;

function SavedNotice({ savedAt }: { savedAt?: number }) {
  if (!savedAt) return null;
  return (
    <p className="text-sm font-bold text-muted-foreground" role="status">
      Datos guardados el {formatDateTime(new Date(savedAt).toISOString())}.
    </p>
  );
}

export function FarmsMap({
  mode,
  onModeChange,
  userId,
  query,
  municipality,
  onMunicipalityChange,
  localFarms,
  focus,
  onSelectFarm,
  municipalityName,
  showProducer,
  loadProvider = appMunicipalityMap,
}: {
  mode: FarmMapMode;
  onModeChange: (mode: FarmMapMode) => void;
  userId: string | undefined;
  query: FarmMapQuery;
  // El municipio elegido en los filtros de la lista.
  municipality: string | null;
  onMunicipalityChange: (code: string | null) => void;
  // Lo de la cola del dispositivo, ya filtrado por la búsqueda.
  localFarms: readonly FarmListItem[];
  focus?: MapFocus;
  onSelectFarm: (id: string) => void;
  municipalityName: (code: string) => string;
  showProducer: boolean;
  // Sin proveedor configurado no se muestra el mapa: la lista basta.
  loadProvider?: LoadMunicipalityMapProvider | null;
}) {
  const byMunicipality = mode === 'municipalities';
  const counts = useFarmMunicipalityCounts(userId, query, {
    enabled: byMunicipality,
  });
  const merged = withLocalCounts(counts.data?.data ?? [], localFarms);
  // Por municipios, si todas las fincas están en uno solo, el mapa entra directo a él. Es solo
  // de la vista: no filtra la lista (una finca nueva en otro municipio debe seguir apareciendo),
  // y tras volver a los municipios no se reentra solo.
  const [shortcutDismissed, setShortcutDismissed] = useState(false);
  const single =
    !shortcutDismissed && merged.length === 1 ? merged[0].code : null;
  // Los puntos: del municipio que se ve (por municipios), o del filtro o de todo (libre).
  const pointsMunicipality = byMunicipality
    ? (municipality ?? single)
    : municipality;
  const points = useFarmMapPoints(userId, pointsMunicipality, query, {
    enabled: !byMunicipality || !!pointsMunicipality,
  });
  const main = byMunicipality ? counts : points;

  if (!loadProvider) return null;

  const switcher = (
    <SegmentedControl
      label="Vista del mapa"
      onChange={onModeChange}
      options={MODE_OPTIONS}
      value={mode}
    />
  );

  if (main.isLoadingError || main.isPending) {
    return (
      <div className="space-y-3">
        {switcher}
        {main.isLoadingError ? (
          <ErrorState
            message="No fue posible cargar el mapa. La lista sigue disponible."
            onRetry={() => void main.refetch()}
          />
        ) : (
          <MapSkeleton className={MUNICIPALITY_MAP_HEIGHT} />
        )}
      </div>
    );
  }

  const shownPoints = () =>
    farmMapPoints(points.data?.data ?? [], localFarms, pointsMunicipality, {
      showProducer,
    });
  const view: MunicipalityMapView = !byMunicipality
    ? { level: 'free', points: shownPoints(), focus }
    : pointsMunicipality
      ? {
          level: 'municipality',
          code: pointsMunicipality,
          points: shownPoints(),
          focus,
        }
      : { level: 'department', counts: merged };
  const total =
    view.level === 'department'
      ? merged.reduce((sum, { count }) => sum + count, 0)
      : view.points.length;
  const place = pointsMunicipality
    ? municipalityName(pointsMunicipality)
    : 'Norte de Santander';

  return (
    <MunicipalityMapPanel
      describeMunicipality={(code, count) =>
        `${municipalityName(code)} · ${farmsLabel(count)}`
      }
      controls={switcher}
      label="Mapa de fincas"
      loadProvider={loadProvider}
      notice={
        <>
          <SavedNotice
            savedAt={
              view.level === 'department'
                ? counts.data?.savedAt
                : points.data?.savedAt
            }
          />
          {view.level === 'municipality' && points.isLoadingError && (
            <p
              className="text-sm font-bold text-muted-foreground"
              role="status"
            >
              Las fincas de este municipio se verán al recuperar la conexión.
            </p>
          )}
        </>
      }
      onBack={() => {
        if (municipality) onMunicipalityChange(null);
        else setShortcutDismissed(true);
      }}
      onSelectMunicipality={onMunicipalityChange}
      onSelectPoint={onSelectFarm}
      title={`${place} · ${farmsLabel(total)}`}
      view={view}
    />
  );
}
