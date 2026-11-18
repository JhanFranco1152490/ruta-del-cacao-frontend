import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { ReportsScreen } from '@/features/reports/components/reports-screen';
import { PERMISSIONS } from '@/lib/permissions';

// El tipo, la vista y los filtros llegan en la URL y los lee el navegador: la página es fija.
export default function ReportsPage() {
  return (
    <PermissionGate
      anyOf={[
        PERMISSIONS.REPORTS_VIEW_PRODUCER,
        PERMISSIONS.REPORTS_VIEW_ASSOCIATION,
      ]}
    >
      <Suspense>
        <ReportsScreen />
      </Suspense>
    </PermissionGate>
  );
}
