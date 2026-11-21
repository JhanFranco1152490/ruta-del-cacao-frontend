'use client';

import { useSearchParams } from 'next/navigation';

import { ErrorState } from '@/components/error-state';
import { healthHistoryPath } from '@/features/health/health-paths';
import { harvestDetailPath } from '@/features/harvests/harvest-paths';
import { LotHistoryScreen } from '@/features/lots/components/history/lot-history-screen';
import { useSession } from '@/hooks/use-session';
import { plotActivitiesPath } from '@/lib/paths/activities';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

// Los enlaces del origen van a la cosecha, a Sanidad y a Actividades, que son de otros dominios.
// Sanidad y Actividades se abren con el mismo permiso: el de ver actividades.
export function LotHistoryFromQuery() {
  const lotId = useSearchParams().get('id');
  const { data: user } = useSession();
  if (!lotId) {
    return <ErrorState message="No se indicó de qué lote ver la historia." />;
  }
  const canSeeHarvest = hasPermission(user, PERMISSIONS.HARVESTS_VIEW);
  const canSeeActivities = hasPermission(user, PERMISSIONS.ACTIVITIES_VIEW);
  return (
    <LotHistoryScreen
      key={lotId}
      lotId={lotId}
      originLinks={({ origin }) => {
        const place = { farm: origin.farm.id, plot: origin.plot.id };
        return {
          harvest: canSeeHarvest
            ? harvestDetailPath(origin.harvest.id)
            : undefined,
          plotHealth: canSeeActivities ? healthHistoryPath(place) : undefined,
          plotActivities: canSeeActivities
            ? plotActivitiesPath(place)
            : undefined,
        };
      }}
    />
  );
}
