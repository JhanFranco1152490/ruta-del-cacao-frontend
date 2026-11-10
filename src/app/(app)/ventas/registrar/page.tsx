'use client';

import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { SaleFormScreen } from '@/features/sales/components/sale-form-screen';
import { PERMISSIONS } from '@/lib/permissions';

import { renderNewBuyer } from './new-buyer';

// La finca y la pantalla de origen llegan en la URL y las lee el navegador. Es de cliente porque
// entrega una función a la pantalla.
export default function NewSalePage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.SALES_ADD]}>
      <Suspense>
        <SaleFormScreen renderNewBuyer={renderNewBuyer} />
      </Suspense>
    </PermissionGate>
  );
}
