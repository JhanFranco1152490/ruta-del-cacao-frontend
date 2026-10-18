import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { HarvestDetailFromQuery } from './harvest-detail-from-query';

// Página fija: la cosecha llega como parámetro de la URL, así abre sin conexión con la copia.
export default function HarvestDetailPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.HARVESTS_VIEW]}>
      <Suspense>
        <HarvestDetailFromQuery />
      </Suspense>
    </PermissionGate>
  );
}
