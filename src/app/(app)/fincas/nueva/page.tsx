import { PermissionGate } from '@/components/permission-gate';
import { FarmForm } from '@/features/farms/components/farm-form';
import { PERMISSIONS } from '@/lib/permissions';

export default function NewFarmPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.FARMS_ADD]}>
      <FarmForm />
    </PermissionGate>
  );
}
