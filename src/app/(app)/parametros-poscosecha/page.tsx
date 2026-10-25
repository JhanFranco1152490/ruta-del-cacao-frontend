import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { ParametersScreen } from '@/features/postharvest-parameters/components/parameters-screen';
import { PERMISSIONS } from '@/lib/permissions';

// Página fija: el productor que elige la cuenta técnica llega en la URL, así que una sola página
// guardada sirve también sin conexión.
export default function ParametersPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.PARAMETERS_VIEW]}>
      <Suspense>
        <ParametersScreen />
      </Suspense>
    </PermissionGate>
  );
}
