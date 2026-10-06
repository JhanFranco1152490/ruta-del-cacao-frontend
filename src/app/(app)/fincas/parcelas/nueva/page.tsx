import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { NewPlotWithFarm } from './new-plot-with-farm';

// Página fija: la finca llega como parámetro de la URL y lo lee el navegador, así que la misma
// página guardada abre sin conexión sobre cualquier finca.
export default function NewPlotPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.PLOTS_ADD]} needsProducer>
      <Suspense>
        <NewPlotWithFarm />
      </Suspense>
    </PermissionGate>
  );
}
