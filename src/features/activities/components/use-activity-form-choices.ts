'use client';

import { useMemo } from 'react';

import { useSession } from '@/hooks/use-session';
import { useFarmOptions } from '@/lib/api/farm-options';
import { usePlotOptions } from '@/lib/api/plot-options';

import { useActivityAssignees } from '../api';
import { type ChoiceList, plotLabel } from './activity-form-fields';

// Lo que ofrece el formulario de una actividad: fincas y parcelas activas y cuentas activas. Las
// listas se arman una vez por lectura, porque cada campo vuelve a poner su valor cuando la suya
// cambia.
export function useActivityFormChoices(farmId: string): {
  farms: ChoiceList;
  plots: ChoiceList;
  assignees: ChoiceList;
} {
  const { data: user } = useSession();
  const userId = user?.id;
  const superuser = user?.is_superuser === true;

  const farms = useFarmOptions(userId, undefined);
  const activeFarms = useMemo(
    () => (farms.data?.data.options ?? []).filter((farm) => farm.isActive),
    [farms.data],
  );
  const farm = activeFarms.find((option) => option.id === farmId);
  const plots = usePlotOptions(farmId);
  // La cuenta técnica asigna entre las cuentas del productor de la finca elegida; las demás
  // cuentas, entre las de su propio productor.
  const assignees = useActivityAssignees(
    userId,
    superuser ? (farm?.producer.id ?? null) : null,
    { enabled: !superuser || !!farm },
  );

  const farmChoices = useMemo(
    () => activeFarms.map(({ id, name }) => ({ id, label: name })),
    [activeFarms],
  );
  const plotChoices = useMemo(
    () =>
      (plots.data ?? [])
        .filter((plot) => plot.isActive)
        .map((plot) => ({ id: plot.id, label: plotLabel(plot) })),
    [plots.data],
  );
  const assigneeChoices = useMemo(
    () =>
      (assignees.data?.data ?? [])
        .filter((account) => account.is_active)
        .map(({ id, full_name }) => ({
          id,
          label: id === userId ? `${full_name} (tú)` : full_name,
        })),
    [assignees.data, userId],
  );

  return {
    farms: {
      choices: farmChoices,
      isLoading: farms.isLoading,
      isError: farms.isError,
    },
    plots: {
      choices: plotChoices,
      isLoading: plots.isLoading,
      isError: plots.isError,
    },
    assignees: {
      choices: assigneeChoices,
      isLoading: assignees.isLoading,
      isError: assignees.isError,
    },
  };
}
