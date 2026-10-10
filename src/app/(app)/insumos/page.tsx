import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { InputsWithFarms } from './inputs-with-farms';

// Los filtros, la finca y el productor llegan en la URL y los lee el navegador: así la página es
// fija y abre sin conexión.
export default function InputsPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.INPUTS_VIEW]}>
      <Suspense>
        <InputsWithFarms />
      </Suspense>
    </PermissionGate>
  );
}
