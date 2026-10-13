import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { ActivityCalendarScreen } from '@/features/activities/components/activity-calendar-screen';
import { PERMISSIONS } from '@/lib/permissions';

// El mes llega en la URL y lo lee el navegador: así la página es fija y abre sin conexión.
export default function ActivitiesPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.ACTIVITIES_VIEW]}>
      <Suspense>
        <ActivityCalendarScreen />
      </Suspense>
    </PermissionGate>
  );
}
