import { PermissionGate } from '@/components/permission-gate';
import { PERMISSIONS } from '@/lib/permissions';

import { NewFarmWithNextStep } from './new-farm-with-next-step';

export default function NewFarmPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.FARMS_ADD]}>
      <NewFarmWithNextStep />
    </PermissionGate>
  );
}
