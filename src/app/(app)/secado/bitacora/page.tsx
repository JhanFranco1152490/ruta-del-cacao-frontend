import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { LogFromQuery } from './log-from-query';

// Página fija: el lote y la bitácora a corregir llegan como parámetros de la URL, así abre sin
// conexión junto a la marquesina.
export default function LogPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.DRYING_LOG]}>
      <Suspense>
        <LogFromQuery />
      </Suspense>
    </PermissionGate>
  );
}
