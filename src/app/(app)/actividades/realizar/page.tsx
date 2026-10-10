import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { CompletionFromQuery } from './completion-from-query';

// Página fija: la actividad llega como parámetro de la URL, así abre sin conexión.
export default function ActivityCompletionPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.ACTIVITIES_COMPLETE]}>
      <Suspense>
        <CompletionFromQuery />
      </Suspense>
    </PermissionGate>
  );
}
