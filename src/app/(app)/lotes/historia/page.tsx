import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { LotHistoryFromQuery } from './lot-history-from-query';

// Página fija: el lote llega como parámetro de la URL, como su ficha.
export default function LotHistoryPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.LOTS_VIEW]}>
      <Suspense>
        <LotHistoryFromQuery />
      </Suspense>
    </PermissionGate>
  );
}
