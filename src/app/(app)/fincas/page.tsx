import { FarmAccessGate } from '@/features/farms/components/farm-access-gate';
import { FarmListScreen } from '@/features/farms/components/farm-list-screen';
import { PERMISSIONS } from '@/lib/permissions';

export default function FarmsPage() {
  return (
    <FarmAccessGate anyOf={[PERMISSIONS.FARMS_VIEW]}>
      <FarmListScreen />
    </FarmAccessGate>
  );
}
