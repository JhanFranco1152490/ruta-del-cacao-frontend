import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { MonitoringFromQuery } from './monitoring-from-query';

// Página fija: el monitoreo llega como parámetro de la URL, así abre sin conexión.
export default function MonitoringPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.ACTIVITIES_COMPLETE]}>
      <Suspense>
        <MonitoringFromQuery />
      </Suspense>
    </PermissionGate>
  );
}
