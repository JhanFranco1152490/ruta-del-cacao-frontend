import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { HistoryWithPlot } from './history-with-plot';

// Página fija: la parcela y su finca llegan como parámetros de la URL. Solo muestra datos con
// conexión; su página se guarda para poder decirlo sin conexión en vez de no abrir.
export default function CharacterizationHistoryPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.PLOTS_VIEW]}>
      <Suspense>
        <HistoryWithPlot />
      </Suspense>
    </PermissionGate>
  );
}
