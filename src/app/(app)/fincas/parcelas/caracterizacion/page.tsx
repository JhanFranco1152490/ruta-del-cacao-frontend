import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { CharacterizationWithPlot } from './characterization-with-plot';

// Página fija: la parcela y su finca llegan como parámetros de la URL, así abre sin conexión.
export default function CharacterizationPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.CROPS_CHARACTERIZE]} needsProducer>
      <Suspense>
        <CharacterizationWithPlot />
      </Suspense>
    </PermissionGate>
  );
}
