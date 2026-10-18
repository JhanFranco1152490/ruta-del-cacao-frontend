import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { Facilities } from './facilities';

export default function FacilitiesPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.FACILITIES_VIEW]}>
      <Suspense>
        <Facilities />
      </Suspense>
    </PermissionGate>
  );
}
