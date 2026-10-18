import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { HarvestRegisterFromQuery } from './harvest-register-from-query';

// Página fija: la parcela o el registro a corregir llegan como parámetros de la URL, así abre sin
// conexión. Registrar pide permiso de registrar; corregir una cosecha del servidor, el de corregir,
// que se revisa adentro.
export default function HarvestRegisterPage() {
  return (
    <PermissionGate
      anyOf={[PERMISSIONS.HARVESTS_ADD, PERMISSIONS.HARVESTS_CHANGE]}
    >
      <Suspense>
        <HarvestRegisterFromQuery />
      </Suspense>
    </PermissionGate>
  );
}
