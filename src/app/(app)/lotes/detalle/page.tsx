import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { LotDetailFromQuery } from './lot-detail-from-query';

// Página fija: el lote llega como parámetro de la URL, como los demás detalles.
export default function LotDetailPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.LOTS_VIEW]}>
      <Suspense>
        <LotDetailFromQuery />
      </Suspense>
    </PermissionGate>
  );
}
