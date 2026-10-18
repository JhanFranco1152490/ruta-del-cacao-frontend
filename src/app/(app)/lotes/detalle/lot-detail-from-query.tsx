'use client';

import { useSearchParams } from 'next/navigation';

import { ErrorState } from '@/components/error-state';
import { characterizationHistoryPath } from '@/features/crops/characterization-paths';
import { harvestDetailPath } from '@/features/harvests/harvest-paths';
import { LotDetailScreen } from '@/features/lots/components/lot-detail-screen';
import { useSession } from '@/hooks/use-session';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export function LotDetailFromQuery() {
  const lotId = useSearchParams().get('id');
  const { data: user } = useSession();
  if (!lotId) {
    return <ErrorState message="No se indicó qué lote mostrar." />;
  }
  const canSeeHarvest = hasPermission(user, PERMISSIONS.HARVESTS_VIEW);
  // El historial de la ficha se consulta desde la parcela: solo quien puede ver parcelas.
  const canSeeHistory = hasPermission(user, PERMISSIONS.PLOTS_VIEW);
  return (
    <LotDetailScreen
      harvestHref={
        canSeeHarvest ? (lot) => harvestDetailPath(lot.harvest.id) : undefined
      }
      historyHref={
        canSeeHistory
          ? (lot) =>
              characterizationHistoryPath(
                lot.harvest.plot.id,
                lot.harvest.plot.farm.id,
              )
          : undefined
      }
      key={lotId}
      lotId={lotId}
    />
  );
}
