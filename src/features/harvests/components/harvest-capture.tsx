'use client';

import Link from 'next/link';
import { type ReactNode, useState } from 'react';

import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { buttonVariants } from '@/components/ui/button';
import { FormMessage } from '@/components/form-message';
import { useSession } from '@/hooks/use-session';

import { useHarvestCollectors } from '../api';
import type { HarvestLotSource } from '../harvest-lot-source';
import type { HarvestPlotChoice } from '../harvest-plots';
import type { QueuedHarvest } from '../harvest-queue';
import { toHarvestRequest } from '../harvest-requests';
import {
  formOfRequest,
  type HarvestFormInput,
  harvestQueueLabel,
  harvestSummary,
  type KeptHarvestFields,
  startForm,
} from '../harvest-values';
import { rememberLastPlot } from '../last-plot';
import { useSaveHarvest } from '../use-harvest-queue';
import { HarvestForm } from './harvest-form';
import { HarvestSaved } from './harvest-saved';

const SAVE_FAILED =
  'No fue posible guardar la cosecha en el dispositivo. Inténtalo nuevamente.';

type Saved = {
  summary: string;
  onDevice: boolean;
  lotSource: HarvestLotSource;
};

// El formulario de una cosecha y, al guardarla, lo que sigue. `rejected` es lo que el servidor no
// aceptó: con él se corrige lo capturado en vez de registrar otra.
export function HarvestCapture({
  plots,
  truncated,
  today,
  initialPlotId,
  rejected,
  isOnline,
  submitLabel,
  blockedMessage,
  doneHref,
  onCorrected,
  renderFormLot,
}: {
  plots: readonly HarvestPlotChoice[];
  truncated: boolean;
  today: string;
  initialPlotId: string;
  rejected?: QueuedHarvest;
  isOnline: boolean;
  submitLabel: string;
  blockedMessage?: string | null;
  doneHref: string;
  onCorrected: () => void;
  // Conformar el lote de una cosecha que ya llegó al servidor; lo da quien monta la pantalla,
  // porque los lotes son de otro dominio.
  renderFormLot?: (source: HarvestLotSource) => ReactNode;
}) {
  const { data: user } = useSession();
  const superuser = user?.is_superuser === true;
  const save = useSaveHarvest();
  const [form, setForm] = useState(() => ({
    id: rejected?.id ?? crypto.randomUUID(),
    values: rejected
      ? formOfRequest(rejected.request)
      : startForm(today, plots, { plot_id: initialPlotId }),
  }));
  const [saved, setSaved] = useState<Saved>();
  const [kept, setKept] = useState<KeptHarvestFields>();
  const [plot, setPlot] = useState(() =>
    plots.find(({ id }) => id === form.values.plot_id),
  );
  // La cuenta técnica ve parcelas de varios productores: los recolectores son los del productor de
  // la parcela elegida.
  const collectors = useHarvestCollectors(
    user?.id,
    superuser ? (plot?.producerId ?? null) : null,
    { enabled: !superuser || !!plot },
  );

  const submit = (values: HarvestFormInput) => {
    const chosen = plots.find(({ id }) => id === values.plot_id)!;
    const variety = chosen.varieties.find(({ id }) => id === values.variety_id);
    const request = toHarvestRequest(values, form.id);
    const lotSource: HarvestLotSource = {
      harvestId: form.id,
      plot: chosen.label,
      farm: chosen.farm,
      harvestDate: values.harvest_date,
      greenWeightKg: request.green_weight_kg,
      variety: variety?.name ?? '',
    };
    save.mutate(
      {
        payload: {
          request,
          label: harvestQueueLabel(chosen.label, values.harvest_date),
          lotSource,
        },
        correcting: !!rejected,
      },
      {
        onSuccess: () => {
          if (user) rememberLastPlot(user.id, values.plot_id);
          if (rejected) return onCorrected();
          setKept({
            plot_id: values.plot_id,
            collector_id: values.collector_id,
            harvest_date: values.harvest_date,
          });
          setSaved({
            summary: harvestSummary(values, variety?.name ?? '', chosen),
            onDevice: !isOnline,
            lotSource,
          });
        },
      },
    );
  };

  if (saved) {
    return (
      <HarvestSaved
        doneHref={doneHref}
        formLot={renderFormLot?.(saved.lotSource)}
        onAnother={() => {
          setForm({
            id: crypto.randomUUID(),
            values: startForm(today, plots, kept),
          });
          setSaved(undefined);
          save.reset();
        }}
        onDevice={saved.onDevice}
        summary={saved.summary}
      />
    );
  }

  return (
    <div className="space-y-4">
      {save.isError && <FormMessage>{SAVE_FAILED}</FormMessage>}
      <HarvestForm
        blockedMessage={blockedMessage}
        collectors={collectors.data?.data}
        defaultValues={form.values}
        isSaving={save.isPending}
        key={form.id}
        onPlotChange={setPlot}
        onSubmit={submit}
        plotLocked={!!rejected}
        plots={plots}
        preferredCollectorId={user?.id}
        secondaryAction={
          <Link
            className={buttonVariants({
              size: 'office',
              variant: 'outline',
              className: CAPTURE_BUTTON_CLASS,
            })}
            href={doneHref}
          >
            Cancelar
          </Link>
        }
        submitLabel={submitLabel}
        today={today}
        truncated={truncated}
      />
    </div>
  );
}
