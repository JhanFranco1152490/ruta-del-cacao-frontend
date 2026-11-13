import { Suspense } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { IndicatorsScreen } from '@/features/indicators/components/indicators-screen';
import { PERMISSIONS } from '@/lib/permissions';

// El periodo, el panel y los filtros llegan en la URL y los lee el navegador: la página es fija.
export default function IndicatorsPage() {
  return (
    <PermissionGate
      anyOf={[
        PERMISSIONS.INDICATORS_VIEW_PRODUCER,
        PERMISSIONS.INDICATORS_VIEW_ASSOCIATION,
      ]}
    >
      <Suspense>
        <IndicatorsScreen />
      </Suspense>
    </PermissionGate>
  );
}
