'use client';

import { useMemo } from 'react';

import { useQueueItems } from '@/hooks/use-queue-items';
import { useSession } from '@/hooks/use-session';
import { usePlotsCharacterizations } from '@/lib/api/plot-characterizations';
import { useSavedPlotOptions } from '@/lib/api/plot-options';
import {
  CHARACTERIZATION_QUEUE_PREFIX,
  plotIdOfCharacterizationQueueId,
} from '@/lib/offline/queue-ids';

import { harvestPlotChoices, type HarvestPlotChoice } from './harvest-plots';

export type HarvestSources =
  | { status: 'loading' }
  // Sin conexión y sin copia de las parcelas en este dispositivo.
  | { status: 'unreachable' }
  | {
      status: 'ready';
      plots: HarvestPlotChoice[];
      // La lista llegó cortada: hay más parcelas que las que caben en una consulta.
      truncated: boolean;
    };

// Lo que el formulario de cosecha necesita del servidor, con copia en el dispositivo: las parcelas
// activas que alcanza la cuenta y sus fichas. Se usa en campo, también sin conexión, con lo que se
// guardó la última vez que se abrió con conexión. Una ficha editada que espera en la cola se marca:
// sus variedades nuevas aún no están en la copia.
export function useHarvestSources(): HarvestSources {
  const { data: user } = useSession();
  const userId = user?.id;
  const plots = useSavedPlotOptions(userId, {});
  const options = plots.data?.data.options;
  const plotIds = useMemo(() => options?.map(({ id }) => id) ?? [], [options]);
  const characterizations = usePlotsCharacterizations(userId, plotIds);
  const queue = useQueueItems(userId);

  return useMemo((): HarvestSources => {
    if (plots.isError && !plots.data) return { status: 'unreachable' };
    if (!options || !user || !queue) return { status: 'loading' };
    // Sin fichas en el dispositivo (nunca se cargaron) las parcelas salen sin siembras: se
    // espera la lectura, y si falla se ofrecen igual, deshabilitadas.
    if (plotIds.length > 0 && characterizations.isPending) {
      return { status: 'loading' };
    }
    const pending = new Set(
      queue
        .filter(({ id }) => id.startsWith(CHARACTERIZATION_QUEUE_PREFIX))
        .map(({ id }) => plotIdOfCharacterizationQueueId(id)),
    );
    return {
      status: 'ready',
      plots: harvestPlotChoices({
        plots: options,
        characterizations: characterizations.data?.data ?? [],
        pendingCharacterizations: pending,
        showProducer: user.is_superuser === true,
      }),
      truncated: (plots.data?.data.count ?? 0) > options.length,
    };
  }, [
    plots.isError,
    plots.data,
    options,
    user,
    queue,
    plotIds.length,
    characterizations.isPending,
    characterizations.data,
  ]);
}
