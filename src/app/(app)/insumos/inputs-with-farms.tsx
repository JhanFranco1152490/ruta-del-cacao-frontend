'use client';

import { useFarmOptions } from '@/features/farms/api';
import { InputListScreen } from '@/features/inputs/components/input-list-screen';
import { useInputFilters } from '@/features/inputs/use-input-filters';
import { useSession } from '@/hooks/use-session';

// Aquí se juntan los dominios: los insumos no leen las fincas, así que la página se las pasa. La
// cuenta técnica las lee solo con un productor elegido, porque las existencias son de una finca.
export function InputsWithFarms() {
  const { data: user } = useSession();
  const { producer } = useInputFilters();
  const superuser = user?.is_superuser === true;
  const farms = useFarmOptions(user?.id, superuser ? producer : null, {
    enabled: !superuser || !!producer,
  });

  return (
    <InputListScreen
      farms={{ choices: farms.data?.data, isLoading: farms.isPending }}
    />
  );
}
