import { FarmAccessGate } from '@/features/farms/components/farm-access-gate';
import { FarmForm } from '@/features/farms/components/farm-form';
import { PERMISSIONS } from '@/lib/permissions';

export default function NewFarmPage() {
  return (
    <FarmAccessGate anyOf={[PERMISSIONS.FARMS_ADD]}>
      <FarmForm />
    </FarmAccessGate>
  );
}
