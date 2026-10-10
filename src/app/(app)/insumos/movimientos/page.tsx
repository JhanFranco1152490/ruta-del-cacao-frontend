import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { MovementsWithFarm } from './movements-with-farm';

// Página fija: el insumo y la finca llegan como parámetros de la URL. Solo muestra movimientos con
// conexión; su página se guarda para poder decirlo sin conexión en vez de no abrir.
export default function InputMovementsPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.INPUTS_VIEW]}>
      <Suspense>
        <MovementsWithFarm />
      </Suspense>
    </PermissionGate>
  );
}
