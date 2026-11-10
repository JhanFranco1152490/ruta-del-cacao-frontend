import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { BuyersScreen } from '@/features/buyers/components/buyers-screen';
import { PERMISSIONS } from '@/lib/permissions';

// Los filtros, el productor y el comprador abierto llegan en la URL y los lee el navegador: así la
// página es fija y abre sin conexión.
export default function BuyersPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.BUYERS_VIEW]}>
      <Suspense>
        <BuyersScreen />
      </Suspense>
    </PermissionGate>
  );
}
