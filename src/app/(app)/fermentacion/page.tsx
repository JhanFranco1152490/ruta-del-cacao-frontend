import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { Fermentation } from './fermentation';

// Página fija: la pestaña y la finca llegan en la URL, así que una sola página guardada sirve
// también sin conexión.
export default function FermentationPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.FERMENTATION_LOG_TURNS]}>
      <Suspense>
        <Fermentation />
      </Suspense>
    </PermissionGate>
  );
}
