import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { AuditLogScreen } from '@/features/audit-log/components/audit-log-screen';
import { PERMISSIONS } from '@/lib/permissions';

// Los filtros y la página llegan en la URL y los lee el navegador: la página es fija.
export default function AuditLogPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.AUDIT_VIEW]}>
      <Suspense>
        <AuditLogScreen />
      </Suspense>
    </PermissionGate>
  );
}
