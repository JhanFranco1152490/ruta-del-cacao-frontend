import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { HealthScreen } from '@/features/health/components/health-screen';
import { PERMISSIONS } from '@/lib/permissions';

// Página fija: los filtros y la página llegan en la URL, así que una sola página guardada sirve
// para cualquier combinación, también sin conexión.
export default function HealthPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.ACTIVITIES_VIEW]}>
      <Suspense>
        <HealthScreen />
      </Suspense>
    </PermissionGate>
  );
}
