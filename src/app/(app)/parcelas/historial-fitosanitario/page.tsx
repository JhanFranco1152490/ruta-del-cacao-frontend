import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { PlotHistoryFromQuery } from './plot-history-from-query';

// Página fija: la parcela y los filtros llegan en la URL, así abre sin conexión.
export default function PlotHistoryPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.ACTIVITIES_VIEW]}>
      <Suspense>
        <PlotHistoryFromQuery />
      </Suspense>
    </PermissionGate>
  );
}
