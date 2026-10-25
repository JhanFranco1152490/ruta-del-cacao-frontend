'use client';

import { useSearchParams } from 'next/navigation';

import { ErrorState } from '@/components/error-state';
import { characterizationHistoryPath } from '@/features/crops/characterization-paths';
import { DryingSection } from '@/features/drying/components/drying-section';
import { FACILITIES_PATH } from '@/features/facilities/facility-paths';
import { FermentationSection } from '@/features/fermentation/components/fermentation-section';
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
  const canSeeFacilities = hasPermission(user, PERMISSIONS.FACILITIES_VIEW);
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
      // El proceso del lote en su orden: la fermentación va antes que el secado.
      renderSections={(lot) => {
        const { farm } = lot.harvest.plot;
        const facilitiesHref = canSeeFacilities
          ? `${FACILITIES_PATH}?${new URLSearchParams({ finca: farm.id })}`
          : undefined;
        const section = {
          id: lot.id,
          code: lot.code,
          status: lot.status,
          greenWeightKg: lot.green_weight_kg,
          farm,
        };
        return (
          <>
            <FermentationSection
              facilitiesHref={facilitiesHref}
              lot={section}
            />
            <DryingSection facilitiesHref={facilitiesHref} lot={section} />
          </>
        );
      }}
    />
  );
}
