import { PermissionGate } from '@/components/permission-gate';
import { FarmListScreen } from '@/features/farms/components/farm-list-screen';
import { PERMISSIONS } from '@/lib/permissions';

export default function FarmsPage() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.FARMS_VIEW]}>
      <FarmListScreen />
    </PermissionGate>
  );
}
