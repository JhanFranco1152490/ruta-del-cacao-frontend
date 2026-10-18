import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { FacilitiesScreen } from '@/features/facilities/components/facilities-screen';
import { PERMISSIONS } from '@/lib/permissions';

export default function FacilitiesPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.FACILITIES_VIEW]}>
      <Suspense>
        <FacilitiesScreen />
      </Suspense>
    </PermissionGate>
  );
}
