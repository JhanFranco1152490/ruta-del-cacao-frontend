'use client';

import { useSearchParams } from 'next/navigation';

import { ErrorState } from '@/components/error-state';
import { characterizationHistoryPath } from '@/features/crops/characterization-paths';
import { HarvestDetailScreen } from '@/features/harvests/components/harvest-detail-screen';
import { useSession } from '@/hooks/use-session';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { lotDetailPath } from '@/features/lots/lot-paths';

import { renderFormLot } from '../form-lot';

export function HarvestDetailFromQuery() {
  const harvestId = useSearchParams().get('id');
  const { data: user } = useSession();
  if (!harvestId) {
    return <ErrorState message="No se indicó qué cosecha mostrar." />;
  }
  // El historial de la ficha se consulta desde la parcela: solo quien puede ver parcelas.
  const canSeeHistory = hasPermission(user, PERMISSIONS.PLOTS_VIEW);
  return (
    <HarvestDetailScreen
      harvestId={harvestId}
      historyHref={
        canSeeHistory
          ? (harvest) =>
              characterizationHistoryPath(harvest.plot.id, harvest.plot.farm.id)
          : undefined
      }
      key={harvestId}
      lotHref={lotDetailPath}
      renderFormLot={renderFormLot}
    />
  );
}
