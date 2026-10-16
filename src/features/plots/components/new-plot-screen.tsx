'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { OfflineBanner } from '@/components/offline-banner';
import { useCaptureSyncStatus } from '@/hooks/use-capture-sync-status';
import { useFinishSave } from '@/hooks/use-finish-save';
import { useSession } from '@/hooks/use-session';
import { readOrigin, withOrigin } from '@/lib/navigation/origin';

import { plotNewPath } from '../plot-paths';
import type { PlotFormValues } from '../plot-queue';
import { useKnownPlots } from '../use-known-plots';
import { usePlotCreate } from '../use-plot-queue';
import { PlotContextBanner } from './plot-context-banner';
import { PlotEditor } from './plot-editor';
import {
  INACTIVE_FARM_MESSAGE,
  NO_SERVER_PLOTS_NOTICE,
  type PlotScreenFarm,
} from './plot-screen-farm';
import { PlotEditorSkeleton } from './plot-screen-states';

export function NewPlotScreen({ farm }: { farm: PlotScreenFarm }) {
  // Un id por formulario: si se guarda dos veces (doble toque, reintento), la cola lo reconoce y
  // no duplica la parcela. Registrar otra parcela abre el formulario de nuevo, con otro id.
  const [plotId] = useState(() => crypto.randomUUID());
  const router = useRouter();
  const create = usePlotCreate();
  const sync = useCaptureSyncStatus('parcelas');
  const known = useKnownPlots(farm.id, { fromServer: !farm.isPendingCreate });
  const { data: user } = useSession();
  const { returnPath, finish } = useFinishSave(farm.detailPath);
  const origin = readOrigin(useSearchParams());

  if (known.isLoading) return <PlotEditorSkeleton />;

  // El código lo asigna el servidor al recibir la parcela; aquí solo se le puede dar un nombre.
  const defaultValues: PlotFormValues = {
    name: '',
    area_hectares: '',
    vertices: [],
  };

  return (
    <PlotEditor
      banner={
        <>
          {!user?.producer_id && farm.producerLabel && (
            <PlotContextBanner
              farmName={farm.name}
              producerLabel={farm.producerLabel}
            />
          )}
          {sync.showBanner && <OfflineBanner status={sync.status} />}
        </>
      }
      blockedMessage={
        !farm.isActive ? INACTIVE_FARM_MESSAGE : sync.blockedMessage
      }
      cancelHref={returnPath}
      defaultValues={defaultValues}
      description="El código y el área son obligatorios; el polígono es opcional. Si no hay conexión, la parcela se guarda en este dispositivo y se envía cuando vuelva la conexión."
      error={
        create.isError
          ? 'No fue posible guardar la parcela en el dispositivo. Inténtalo nuevamente.'
          : null
      }
      farm={farm}
      isSaving={create.isPending}
      knownPlots={known.plots ?? []}
      notice={
        known.serverUnavailable && (
          <p className="mt-6 font-bold text-warn" role="status">
            {NO_SERVER_PLOTS_NOTICE}
          </p>
        )
      }
      onSubmit={(values) =>
        create.mutate(
          { id: plotId, farmId: farm.id, values },
          {
            onSuccess: () =>
              finish('Parcela guardada', {
                action: {
                  label: 'Registrar otra parcela',
                  onClick: () =>
                    router.push(withOrigin(plotNewPath(farm.id), origin ?? '')),
                },
              }),
          },
        )
      }
      submitLabel="Guardar parcela"
      title="Registrar parcela"
      crumb="Nueva parcela"
    />
  );
}
