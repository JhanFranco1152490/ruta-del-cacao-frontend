import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { SaleFormScreen } from '@/features/sales/components/sale-form-screen';
import { PERMISSIONS } from '@/lib/permissions';

// La finca y la pantalla de origen llegan en la URL y las lee el navegador.
export default function NewSalePage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.SALES_ADD]}>
      <Suspense>
        <SaleFormScreen />
      </Suspense>
    </PermissionGate>
  );
}
