'use client';

import { useState } from 'react';

import { ErrorState } from '@/components/error-state';
import type {
  LoadMunicipalityMapProvider,
  MunicipalityMapView,
} from '@/components/map/map-provider';
import { MapSkeleton } from '@/components/map/map-states';
import { MunicipalityMapPanel } from '@/components/map/municipality-map-panel';
import { loadMunicipalityMapProvider as appMunicipalityMap } from '@/config/map';
import { formatDateTime } from '@/lib/format/dates';

import type { FarmListItem } from '../farm-list-item';
import { farmMapPoints, withLocalCounts } from '../farm-map-data';
import {
  type FarmMapQuery,
  useFarmMapPoints,
  useFarmMunicipalityCounts,
} from '../map-api';

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

export function FarmsMunicipalityMap({
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
  userId: string | undefined;
  query: FarmMapQuery;
  municipality: string | null;
  onMunicipalityChange: (code: string | null) => void;
  // Lo de la cola del dispositivo, ya filtrado por la búsqueda.
  localFarms: readonly FarmListItem[];
  focus?: { pointId: string };
  onSelectFarm: (id: string) => void;
  municipalityName: (code: string) => string;
  showProducer: boolean;
  // Sin proveedor configurado no se muestra el mapa: la lista basta.
  loadProvider?: LoadMunicipalityMapProvider | null;
}) {
  const counts = useFarmMunicipalityCounts(userId, query);
  const merged = withLocalCounts(counts.data?.data ?? [], localFarms);
  // Si todas las fincas están en un solo municipio, el mapa entra directo a él. Es solo de la
  // vista: no filtra la lista (una finca nueva en otro municipio debe seguir apareciendo), y
  // tras volver a los municipios no se reentra solo.
  const [shortcutDismissed, setShortcutDismissed] = useState(false);
  const single =
    !shortcutDismissed && merged.length === 1 ? merged[0].code : null;
  const shown = municipality ?? single;
  const points = useFarmMapPoints(userId, shown, query);

  if (!loadProvider) return null;
  if (counts.isLoadingError) {
    return (
      <ErrorState
        message="No fue posible cargar el mapa. La lista sigue disponible."
        onRetry={() => void counts.refetch()}
      />
    );
  }
  if (counts.isPending) return <MapSkeleton className="h-80 lg:h-[34rem]" />;

  const view: MunicipalityMapView = shown
    ? {
        level: 'municipality',
        code: shown,
        points: farmMapPoints(points.data?.data ?? [], localFarms, shown, {
          showProducer,
        }),
        focus,
      }
    : { level: 'department', counts: merged };
  const total =
    view.level === 'municipality'
      ? view.points.length
      : merged.reduce((sum, { count }) => sum + count, 0);
  const place = shown ? municipalityName(shown) : 'Norte de Santander';

  return (
    <MunicipalityMapPanel
      describeMunicipality={(code, count) =>
        `${municipalityName(code)} · ${farmsLabel(count)}`
      }
      label="Mapa de fincas"
      loadProvider={loadProvider}
      notice={
        <>
          <SavedNotice
            savedAt={shown ? points.data?.savedAt : counts.data.savedAt}
          />
          {shown && points.isLoadingError && (
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
