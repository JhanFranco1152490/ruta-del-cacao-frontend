import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { Warehouse } from './warehouse';

// Página fija: la pestaña, los filtros y el lote a trabajar llegan en la URL, así que una sola
// página guardada sirve también sin conexión.
export default function WarehousePage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.WAREHOUSE_VIEW_STOCK]}>
      <Suspense>
        <Warehouse />
      </Suspense>
    </PermissionGate>
  );
}
