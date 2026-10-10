'use client';

import { useMemo } from 'react';

import { useSession } from '@/hooks/use-session';
import { useFarmOptions } from '@/lib/api/farm-options';
import { usePlotOptions } from '@/lib/api/plot-options';

import {
  ACTIVITY_TYPE_OPTIONS,
  SCHEDULABLE_ACTIVITY_TYPE_OPTIONS,
} from '../activity-labels';
import { type AgriculturalActivity, useActivityAssignees } from '../api';
import {
  type ChoiceList,
  type FormChoice,
  plotLabel,
} from './activity-form-fields';

const toChoices = (
  types: readonly { value: string; label: string }[],
): FormChoice[] => types.map(({ value, label }) => ({ id: value, label }));

const SCHEDULABLE_TYPES = toChoices(SCHEDULABLE_ACTIVITY_TYPE_OPTIONS);
const ALL_TYPES = toChoices(ACTIVITY_TYPE_OPTIONS);

// Lo que ofrece el formulario de una actividad: fincas y parcelas activas, tipos que se pueden
// programar y cuentas activas. Al editar (`activity`) no se elige parcela, y lo que la actividad
// ya tiene se conserva aunque hoy no se ofrecería: su responsable, si la cuenta se desactivó, y
// su tipo, si es un control fitosanitario. Las listas se arman una vez por lectura, porque cada
// campo vuelve a poner su valor cuando la suya cambia.
export function useActivityFormChoices(
  farmId: string,
  activity?: AgriculturalActivity,
): {
  farms: ChoiceList;
  plots: ChoiceList;
  types: readonly FormChoice[];
  assignees: ChoiceList;
} {
  const { data: user } = useSession();
  const userId = user?.id;
  const superuser = user?.is_superuser === true;
  const editing = !!activity;

  const farms = useFarmOptions(userId, undefined, { enabled: !editing });
  const activeFarms = useMemo(
    () => (farms.data?.data.options ?? []).filter((farm) => farm.isActive),
    [farms.data],
  );
  const plots = usePlotOptions(editing ? '' : farmId);
  // La cuenta técnica asigna entre las cuentas del productor de la parcela; las demás cuentas,
  // entre las de su propio productor.
  const producerId =
    activity?.producer_id ??
    activeFarms.find((option) => option.id === farmId)?.producer.id;
  const assignees = useActivityAssignees(
    userId,
    superuser ? (producerId ?? null) : null,
    { enabled: !superuser || !!producerId },
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
  const current = activity?.assignee;
  const assigneeChoices = useMemo(() => {
    const active = (assignees.data?.data ?? [])
      .filter((account) => account.is_active)
      .map(({ id, full_name }) => ({
        id,
        label: id === userId ? `${full_name} (tú)` : full_name,
      }));
    if (!current || active.some(({ id }) => id === current.id)) return active;
    return [
      { id: current.id, label: `${current.full_name} · Cuenta inactiva` },
      ...active,
    ];
  }, [assignees.data, userId, current]);

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
    types:
      activity?.activity_type === 'phytosanitary_control'
        ? ALL_TYPES
        : SCHEDULABLE_TYPES,
    assignees: {
      choices: assigneeChoices,
      isLoading: assignees.isLoading,
      isError: assignees.isError,
    },
  };
}
