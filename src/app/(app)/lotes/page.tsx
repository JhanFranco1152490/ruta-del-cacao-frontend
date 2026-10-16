import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { LotList } from './lot-list';

export default function LotsPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.LOTS_VIEW]}>
      <Suspense>
        <LotList />
      </Suspense>
    </PermissionGate>
  );
}
