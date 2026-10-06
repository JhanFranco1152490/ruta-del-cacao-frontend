'use client';

import { useState } from 'react';

import { OfflineBanner } from '@/components/offline-banner';
import { useCaptureSyncStatus } from '@/hooks/use-capture-sync-status';
import { useSession } from '@/hooks/use-session';

import type { PlotFormValues } from '../plot-queue';
import { suggestPlotCode } from '../suggest-code';
import { useKnownPlots } from '../use-known-plots';
import { usePlotCreate } from '../use-plot-queue';
import { PlotContextBanner } from './plot-context-banner';
import { PlotEditor } from './plot-editor';
import { PlotSavedPanel } from './plot-saved-panel';
import {
  INACTIVE_FARM_MESSAGE,
  NO_SERVER_PLOTS_NOTICE,
  type PlotScreenFarm,
} from './plot-screen-farm';
import { PlotEditorSkeleton } from './plot-screen-states';

export function NewPlotScreen({ farm }: { farm: PlotScreenFarm }) {
  // Un id por formulario: si se guarda dos veces (doble toque, reintento), la cola lo reconoce y
  // no duplica la parcela. Registrar otra parcela monta un formulario nuevo con otro id.
  const [plotId, setPlotId] = useState(() => crypto.randomUUID());
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const create = usePlotCreate();
  const sync = useCaptureSyncStatus('parcelas');
  const known = useKnownPlots(farm.id, { fromServer: !farm.isPendingCreate });
  const { data: user } = useSession();

  if (savedCode) {
    return (
      <PlotSavedPanel
        code={savedCode}
        farmDetailPath={farm.detailPath}
        farmId={farm.id}
        onRegisterAnother={() => {
          setPlotId(crypto.randomUUID());
          setSavedCode(null);
          create.reset();
        }}
        plotId={plotId}
      />
    );
  }
  if (known.isLoading) return <PlotEditorSkeleton />;

  // Se propone el código siguiente de la finca: la persona puede cambiarlo, pero casi nunca hace
  // falta pensar uno.
  const defaultValues: PlotFormValues = {
    code: suggestPlotCode((known.plots ?? []).map((plot) => plot.code)),
    area_hectares: '',
    vertices: [],
  };

  return (
    <PlotEditor
      key={plotId}
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
      cancelHref={farm.detailPath}
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
          { onSuccess: () => setSavedCode(values.code) },
        )
      }
      submitLabel="Guardar parcela"
      title="Registrar parcela"
    />
  );
}
