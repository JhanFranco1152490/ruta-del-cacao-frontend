'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Breadcrumb } from '@/components/breadcrumb';
import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { PageHeader } from '@/components/page-header';
import { PageNotice } from '@/components/page-notice';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinishSave } from '@/hooks/use-finish-save';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { getErrorMessage, isApiError } from '@/lib/api/errors';
import { todayInBogota } from '@/lib/format/dates';

import {
  currentHarvestOf,
  type Harvest,
  HARVEST_ERROR,
  useCorrectHarvest,
  useHarvest,
  useHarvestCollectors,
} from '../api';
import { harvestDetailPath, HARVESTS_PATH } from '../harvest-paths';
import { harvestToFormValues, toHarvestUpdate } from '../harvest-rules';
import { useHarvestSources } from '../use-harvest-sources';
import { HarvestForm } from './harvest-form';

const STALE_MESSAGE =
  'Otra persona cambió esta cosecha. Revisa los datos actuales antes de guardar.';
const SAVE_FAILED =
  'No fue posible corregir la cosecha. Revisa tu conexión e inténtalo nuevamente.';

const Loading = () => (
  <div
    aria-label="Cargando cosecha"
    className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-8"
    role="status"
  >
    <Skeleton className="h-12 w-2/3" />
    <Skeleton className="h-96" />
  </div>
);

// Corregir una cosecha que ya está en el servidor y todavía no forma un lote: un error de
// digitación antes de conformarlo. Solo en línea, con la versión leída; la parcela no cambia.
export function HarvestCorrectionScreen({ harvestId }: { harvestId: string }) {
  const { data: user } = useSession();
  const isOnline = useHasConnection();
  const read = useHarvest(user?.id, harvestId);
  const sources = useHarvestSources();
  const correct = useCorrectHarvest();
  const { returnPath, finish } = useFinishSave(harvestDetailPath(harvestId));
  // Tras una versión obsoleta el formulario parte de la vigente, que llega con el error.
  const [current, setCurrent] = useState<Harvest>();
  const [message, setMessage] = useState<string>();
  const harvest = current ?? read.data?.data;
  const collectors = useHarvestCollectors(
    user?.id,
    user?.is_superuser ? (harvest?.producer_id ?? null) : null,
    { enabled: !!harvest },
  );

  if (!isOnline) {
    return (
      <PageNotice
        description="Vuelve a intentarlo cuando haya señal."
        title="Corregir una cosecha necesita conexión."
      />
    );
  }
  if (read.isError && isApiError(read.error) && read.error.status === 404) {
    return <PageNotice title="Esta cosecha ya no existe." />;
  }
  if (!harvest || sources.status !== 'ready') return <Loading />;
  if (harvest.lot) {
    return (
      <PageNotice
        description="Su peso es el del lote y su fecha forma parte del código."
        title={`Esta cosecha forma el lote ${harvest.lot.code}: ya no se puede modificar.`}
      />
    );
  }
  const plot = sources.plots.find(({ id }) => id === harvest.plot.id);
  if (!plot || plot.disabled) {
    return (
      <PageNotice
        description="Para corregirla, la parcela debe estar activa y tener siembras en su ficha."
        title="La parcela de esta cosecha ya no se puede usar."
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8">
      <Breadcrumb
        items={[
          { label: 'Cosechas', href: HARVESTS_PATH },
          { label: 'Corregir cosecha' },
        ]}
      />
      <PageHeader
        description="Mientras no forme un lote se corrigen la fecha, el peso, la variedad y el recolector. La parcela no cambia."
        eyebrow="Producción"
        title="Corregir cosecha"
      />
      {message && (
        <p
          className="mt-6 rounded-(--radius) bg-err-bg px-4 py-3 font-bold text-err"
          role="alert"
        >
          {message}
        </p>
      )}
      <div className="mt-6">
        <HarvestForm
          collectors={collectors.data?.data}
          defaultValues={harvestToFormValues(harvest)}
          isSaving={correct.isPending}
          key={harvest.version}
          keptCollector={{
            id: harvest.collector.id,
            label: harvest.collector.full_name,
          }}
          onSubmit={(values) => {
            setMessage(undefined);
            correct.mutate(
              { id: harvest.id, body: toHarvestUpdate(values, harvest) },
              {
                onSuccess: () => finish('Cosecha corregida'),
                onError: (error) => {
                  const fresh = currentHarvestOf(error);
                  if (fresh) {
                    setCurrent(fresh);
                    setMessage(STALE_MESSAGE);
                  } else if (
                    isApiError(error) &&
                    error.code === HARVEST_ERROR.inLot
                  ) {
                    setMessage(
                      'Esta cosecha ya forma un lote: no se puede modificar.',
                    );
                  } else {
                    setMessage(getErrorMessage(error, SAVE_FAILED));
                  }
                },
              },
            );
          }}
          plotLocked
          plots={sources.plots}
          secondaryAction={
            <Link
              className={buttonVariants({
                size: 'office',
                variant: 'outline',
                className: CAPTURE_BUTTON_CLASS,
              })}
              href={returnPath}
            >
              Cancelar
            </Link>
          }
          submitLabel="Guardar"
          today={todayInBogota()}
          truncated={sources.truncated}
        />
      </div>
    </div>
  );
}
