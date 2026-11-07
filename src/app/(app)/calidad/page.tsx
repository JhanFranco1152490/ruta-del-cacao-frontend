import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { Quality } from './quality';

// Página fija: la pestaña, los filtros y el lote a trabajar llegan en la URL, así que una sola
// página guardada sirve también sin conexión.
export default function QualityPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.QUALITY_EVALUATE]}>
      <Suspense>
        <Quality />
      </Suspense>
    </PermissionGate>
  );
}
