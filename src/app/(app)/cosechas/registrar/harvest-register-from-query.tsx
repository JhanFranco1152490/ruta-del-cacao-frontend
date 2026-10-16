'use client';

import { useSearchParams } from 'next/navigation';

import { characterizationPath } from '@/features/crops/characterization-paths';
import { HarvestCorrectionScreen } from '@/features/harvests/components/harvest-correction-screen';
import { HarvestRegisterScreen } from '@/features/harvests/components/harvest-register-screen';
import { PermissionGate } from '@/components/permission-gate';
import { HARVESTS_PATH } from '@/features/harvests/harvest-paths';
import { useReturnPath } from '@/hooks/use-return-path';
import { PERMISSIONS } from '@/lib/permissions';

import { renderFormLotReturningTo } from '../form-lot';

export function HarvestRegisterFromQuery() {
  const params = useSearchParams();
  const plotId = params.get('parcela') ?? undefined;
  const pendingId = params.get('pendiente') ?? undefined;
  const harvestId = params.get('id');
  // Donde termina el registro («Listo»): también a donde vuelve el lote conformado desde aquí.
  const doneHref = useReturnPath(HARVESTS_PATH);
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
        renderFormLot={renderFormLotReturningTo(doneHref)}
      />
    </PermissionGate>
  );
}
