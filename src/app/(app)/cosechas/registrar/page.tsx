import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { HarvestRegisterFromQuery } from './harvest-register-from-query';

// Página fija: la parcela o el registro a corregir llegan como parámetros de la URL, así abre sin
// conexión.
export default function HarvestRegisterPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.HARVESTS_ADD]}>
      <Suspense>
        <HarvestRegisterFromQuery />
      </Suspense>
    </PermissionGate>
  );
}
