'use client';

import { useRouter } from 'next/navigation';

import { OfflineBanner } from '@/components/offline-banner';
import { useCaptureSyncStatus } from '@/hooks/use-capture-sync-status';

import type { Plot } from '../api';
import { type QueuedPlot, plotToFormValues } from '../plot-queue';
import { useKnownPlots } from '../use-known-plots';
import {
  usePlotResubmit,
  usePlotUpdate,
  useQueuedPlot,
} from '../use-plot-queue';
import { PlotEditor } from './plot-editor';
import {
  INACTIVE_FARM_MESSAGE,
  NO_SERVER_PLOTS_NOTICE,
  type PlotScreenFarm,
} from './plot-screen-farm';
import { PlotEditorSkeleton, PlotUnavailable } from './plot-screen-states';

const SAVE_FAILED =
  'No fue posible guardar los cambios en el dispositivo. Inténtalo nuevamente.';

// Lo que sigue en la cola del dispositivo se edita ahí mismo; si no hay nada pendiente, se edita
// la parcela del servidor (o su copia sin conexión).
export function EditPlotScreen({
  farm,
  plotId,
}: {
  farm: PlotScreenFarm;
  plotId: string;
}) {
  const queued = useQueuedPlot(plotId);

  if (queued.isPending) return <PlotEditorSkeleton />;
  if (queued.isError) {
    return (
      <PlotUnavailable
        backHref={farm.detailPath}
        message="No fue posible leer la parcela guardada en este dispositivo."
      />
    );
  }
  if (queued.data) return <QueuedPlotEditor farm={farm} plot={queued.data} />;
  return <ServerPlotEditor farm={farm} plotId={plotId} />;
}

function ServerPlotEditor({
  farm,
  plotId,
}: {
  farm: PlotScreenFarm;
  plotId: string;
}) {
  const known = useKnownPlots(farm.id);

  if (known.isLoading) return <PlotEditorSkeleton />;
  const plot = known.serverPlots?.find(({ id }) => id === plotId);
  if (!plot) {
    return (
      <PlotUnavailable
        backHref={farm.detailPath}
        message={
          known.serverUnavailable
            ? 'No fue posible cargar la parcela. Si no la has abierto antes con conexión, necesitas conexión para editarla.'
            : 'No encontramos esta parcela en la finca.'
        }
      />
    );
  }
  return (
    <SavedPlotEditor farm={farm} knownPlots={known.plots ?? []} plot={plot} />
  );
}

function SavedPlotEditor({
  farm,
  plot,
  knownPlots,
}: {
  farm: PlotScreenFarm;
  plot: Plot;
  knownPlots: Parameters<typeof PlotEditor>[0]['knownPlots'];
}) {
  const router = useRouter();
  const update = usePlotUpdate();
  const sync = useCaptureSyncStatus('parcelas');

  return (
    <PlotEditor
      banner={sync.showBanner && <OfflineBanner status={sync.status} />}
      blockedMessage={
        !farm.isActive ? INACTIVE_FARM_MESSAGE : sync.blockedMessage
      }
      cancelHref={farm.detailPath}
      defaultValues={plotToFormValues(plot)}
      description="Los cambios se guardan en este dispositivo y se envían cuando haya conexión. Al editar, el polígono se reemplaza completo."
      error={update.isError ? SAVE_FAILED : null}
      farm={farm}
      isSaving={update.isPending}
      knownPlots={knownPlots}
      onSubmit={(values) =>
        update.mutate(
          {
            id: plot.id,
            farmId: farm.id,
            values,
            expectedVersion: plot.version,
          },
          { onSuccess: () => router.push(farm.detailPath) },
        )
      }
      selfId={plot.id}
      submitLabel="Guardar cambios"
      title="Editar parcela"
    />
  );
}

function QueuedPlotEditor({
  farm,
  plot,
}: {
  farm: PlotScreenFarm;
  plot: QueuedPlot;
}) {
  const router = useRouter();
  const resubmit = usePlotResubmit();
  const sync = useCaptureSyncStatus('parcelas');
  const known = useKnownPlots(farm.id, { fromServer: !farm.isPendingCreate });
  const failed = plot.status === 'error';

  if (known.isLoading) return <PlotEditorSkeleton />;

  return (
    <PlotEditor
      banner={sync.showBanner && <OfflineBanner status={sync.status} />}
      blockedMessage={
        !farm.isActive ? INACTIVE_FARM_MESSAGE : sync.blockedMessage
      }
      cancelHref={farm.detailPath}
      defaultValues={plot.values}
      description="Los cambios se guardan en este dispositivo y la parcela se vuelve a enviar cuando haya conexión."
      error={resubmit.isError ? SAVE_FAILED : null}
      farm={farm}
      isSaving={resubmit.isPending}
      knownPlots={known.plots ?? []}
      notice={
        <>
          {failed && (
            <p
              className="mt-6 rounded-(--radius) bg-err-bg px-4 py-3 font-bold text-err"
              role="alert"
            >
              No se pudo sincronizar
              {plot.errorMessage ? `: ${plot.errorMessage}` : '.'} Corrige los
              datos y guarda para reenviarla.
            </p>
          )}
          {known.serverUnavailable && (
            <p className="mt-6 font-bold text-warn" role="status">
              {NO_SERVER_PLOTS_NOTICE}
            </p>
          )}
        </>
      }
      onSubmit={(values) =>
        resubmit.mutate(
          { plot, values },
          { onSuccess: () => router.push(farm.detailPath) },
        )
      }
      selfId={plot.id}
      submitLabel={failed ? 'Guardar y reenviar' : 'Guardar cambios'}
      title={failed ? 'Corregir parcela' : 'Editar parcela'}
    />
  );
}
