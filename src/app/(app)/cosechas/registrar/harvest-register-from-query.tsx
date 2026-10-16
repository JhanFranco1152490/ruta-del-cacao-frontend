'use client';

import { useSearchParams } from 'next/navigation';

import { characterizationPath } from '@/features/crops/characterization-paths';
import { HarvestCorrectionScreen } from '@/features/harvests/components/harvest-correction-screen';
import { HarvestRegisterScreen } from '@/features/harvests/components/harvest-register-screen';
import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

export function HarvestRegisterFromQuery() {
  const params = useSearchParams();
  const plotId = params.get('parcela') ?? undefined;
  const pendingId = params.get('pendiente') ?? undefined;
  const harvestId = params.get('id');
  // Corregir una cosecha que ya está en el servidor: otra pantalla y otro permiso.
  if (harvestId) {
    return (
      <PermissionGate anyOf={[PERMISSIONS.HARVESTS_CHANGE]}>
        <HarvestCorrectionScreen harvestId={harvestId} key={harvestId} />
      </PermissionGate>
    );
  }
  // Otra parcela u otro registro es otra captura: la pantalla se monta de nuevo.
  return (
    <PermissionGate anyOf={[PERMISSIONS.HARVESTS_ADD]}>
      <HarvestRegisterScreen
        characterizationHref={(plot) =>
          characterizationPath(plot.id, plot.farmId)
        }
        key={`${plotId ?? ''}:${pendingId ?? ''}`}
        pendingId={pendingId}
        plotId={plotId}
      />
    </PermissionGate>
  );
}
