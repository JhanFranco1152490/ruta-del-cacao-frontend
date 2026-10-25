import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { Drying } from './drying';

// Página fija: la pestaña y la finca llegan en la URL, así que una sola página guardada sirve
// también sin conexión.
export default function DryingPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.DRYING_LOG]}>
      <Suspense>
        <Drying />
      </Suspense>
    </PermissionGate>
  );
}
