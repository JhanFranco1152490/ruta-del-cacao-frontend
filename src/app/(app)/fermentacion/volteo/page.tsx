import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { TurnFromQuery } from './turn-from-query';

// Página fija: el lote y el volteo a corregir llegan como parámetros de la URL, así abre sin
// conexión junto al cajón.
export default function TurnPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.FERMENTATION_LOG_TURNS]}>
      <Suspense>
        <TurnFromQuery />
      </Suspense>
    </PermissionGate>
  );
}
