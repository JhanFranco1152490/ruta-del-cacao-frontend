'use client';

import { useMemo } from 'react';

import { InputListScreen } from '@/features/inputs/components/input-list-screen';
import { useInputFilters } from '@/features/inputs/use-input-filters';
import { useFarmOptions } from '@/lib/api/farm-options';
import { useSession } from '@/hooks/use-session';

// Aquí se juntan los dominios: los insumos no leen las fincas, así que la página se las pasa. La
// cuenta técnica las lee solo con un productor elegido, porque las existencias son de una finca.
export function InputsWithFarms() {
  const { data: user } = useSession();
  const { producer } = useInputFilters();
  const superuser = user?.is_superuser === true;
  const farms = useFarmOptions(
    user?.id,
    superuser ? (producer ?? undefined) : undefined,
    { enabled: !superuser || !!producer },
  );
  const options = farms.data?.data.options;
  const choices = useMemo(
    () =>
      options?.map(({ id, name, isActive }) => ({
        id,
        name,
        is_active: isActive,
      })),
    [options],
  );

  return <InputListScreen farms={{ choices, isLoading: farms.isPending }} />;
}
