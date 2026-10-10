import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { ActivitiesWithInputs } from './activities-with-inputs';

// El mes llega en la URL y lo lee el navegador: así la página es fija y abre sin conexión.
export default function ActivitiesPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.ACTIVITIES_VIEW]}>
      <Suspense>
        <ActivitiesWithInputs />
      </Suspense>
    </PermissionGate>
  );
}
