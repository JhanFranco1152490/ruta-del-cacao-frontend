import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { SalesScreen } from '@/features/sales/components/sales-screen';
import { PERMISSIONS } from '@/lib/permissions';

// El mes, los filtros y el productor llegan en la URL y los lee el navegador: así la página es fija
// y abre sin conexión.
export default function SalesPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.SALES_VIEW]}>
      <Suspense>
        <SalesScreen />
      </Suspense>
    </PermissionGate>
  );
}
