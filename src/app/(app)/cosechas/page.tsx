import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { HarvestList } from './harvest-list';

// El mes y los filtros llegan en la URL y los lee el navegador: así la página es fija y abre sin
// conexión.
export default function HarvestsPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.HARVESTS_VIEW]}>
      <Suspense>
        <HarvestList />
      </Suspense>
    </PermissionGate>
  );
}
