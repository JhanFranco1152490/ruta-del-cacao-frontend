'use client';

import { useMemo } from 'react';

import { useSession } from '@/hooks/use-session';
import { FARM_OPTIONS_SIZE, useFarmOptions } from '@/lib/api/farm-options';
import { PLOT_OPTIONS_SIZE, usePlotOptions } from '@/lib/api/plot-options';
import { producerLabelOf } from '@/lib/format/producer';

import {
  ACTIVITY_TYPE_OPTIONS,
  SCHEDULABLE_ACTIVITY_TYPE_OPTIONS,
} from '../activity-labels';
import { type AgriculturalActivity, useActivityAssignees } from '../api';
import {
  type ChoiceList,
  type FormChoice,
  plotLabel,
} from './activity-choices';

const toChoices = (
  types: readonly { value: string; label: string }[],
): FormChoice[] => types.map(({ value, label }) => ({ id: value, label }));

const SCHEDULABLE_TYPES = toChoices(SCHEDULABLE_ACTIVITY_TYPE_OPTIONS);
const ALL_TYPES = toChoices(ACTIVITY_TYPE_OPTIONS);

// Lo que ofrece el formulario de una actividad: fincas y parcelas activas (hasta el tope de una
// página, y acotadas por la finca o el productor que se haya elegido), tipos que se pueden
// programar y cuentas activas. Al editar (`activity`) no se elige parcela, y lo que la actividad
// ya tiene se conserva aunque hoy no se ofrecería: su responsable, si la cuenta se desactivó, y
// su tipo, si es un control fitosanitario. Las listas se arman una vez por lectura, porque cada
// campo vuelve a poner su valor cuando la suya cambia.
export function useActivityFormChoices(
  // La finca con la que se acotan las parcelas: la que se eligió en su campo, no la que dedujo
  // una parcela elegida (así se puede seguir mirando todas).
  farmFilter: string,
  // La parcela elegida: de ella salen su finca y su productor.
  plotId: string,
  activity?: AgriculturalActivity,
  // El productor que eligió la cuenta técnica para acotar las listas (o el de la finca desde la
  // que se abrió el formulario). Sin él se ofrece todo lo que alcanza quien pregunta.
  chosenProducer?: string,
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
  // Quien ve los de varios productores necesita leer de quién es cada finca y parcela.
  const showProducer = superuser;
  const producerFilter = superuser ? chosenProducer : undefined;

  const farms = useFarmOptions(userId, producerFilter, { enabled: !editing });
  const activeFarms = useMemo(
    () => (farms.data?.data.options ?? []).filter((farm) => farm.isActive),
    [farms.data],
  );
  const plots = usePlotOptions(
    { farm: farmFilter || undefined, producer: producerFilter },
    { enabled: !editing },
  );
  const offeredPlots = useMemo(
    () =>
      (plots.data?.options ?? []).filter(
        (plot) => plot.isActive && plot.farm.isActive,
      ),
    [plots.data],
  );
  // La cuenta técnica asigna entre las cuentas del productor de la parcela; las demás cuentas,
  // entre las de su propio productor.
  const producerId =
    activity?.producer_id ??
    chosenProducer ??
    offeredPlots.find((plot) => plot.id === plotId)?.farm.producer.id ??
    activeFarms.find((option) => option.id === farmFilter)?.producer.id;
  const assignees = useActivityAssignees(
    userId,
    superuser ? (producerId ?? null) : null,
    { enabled: !superuser || !!producerId },
  );

  const farmChoices = useMemo(
    () =>
      activeFarms.map(({ id, name, producer }) => ({
        id,
        label: showProducer ? `${name} · ${producerLabelOf(producer)}` : name,
      })),
    [activeFarms, showProducer],
  );
  const plotChoices = useMemo(
    () =>
      offeredPlots.map((plot) => ({
        id: plot.id,
        label: plotLabel(plot),
        group: showProducer
          ? `${plot.farm.name} · ${producerLabelOf(plot.farm.producer)}`
          : plot.farm.name,
        farmId: plot.farm.id,
      })),
    [offeredPlots, showProducer],
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
      truncated: (farms.data?.data.count ?? 0) > FARM_OPTIONS_SIZE,
    },
    plots: {
      choices: plotChoices,
      isLoading: plots.isLoading,
      isError: plots.isError,
      truncated: (plots.data?.count ?? 0) > PLOT_OPTIONS_SIZE,
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
