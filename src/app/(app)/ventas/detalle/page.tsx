import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { SaleDetailScreen } from '@/features/sales/components/sale-detail-screen';
import { PERMISSIONS } from '@/lib/permissions';

// Página fija: la venta llega como parámetro de la URL, así abre sin conexión con la copia.
export default function SaleDetailPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.SALES_VIEW]}>
      <Suspense>
        <SaleDetailScreen />
      </Suspense>
    </PermissionGate>
  );
}
