'use client';

import Link from 'next/link';

import { Breadcrumb } from '@/components/breadcrumb';
import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { OfflineBanner } from '@/components/offline-banner';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { useCaptureSyncStatus } from '@/hooks/use-capture-sync-status';
import { useFinishSave } from '@/hooks/use-finish-save';
import { useSession } from '@/hooks/use-session';
import { formatDateTime } from '@/lib/format/dates';
import { formatHectares } from '@/lib/format/hectares';
import { isPausedWithoutData } from '@/lib/offline/paused-read';

import {
  type PlotCharacterization,
  useActiveCacaoVarieties,
  useFarmCharacterizations,
} from '../api';
import {
  characterizationBase,
  characterizationBlockedMessage,
} from '../characterization-base';
import type { QueuedCharacterization } from '../characterization-queue';
import { characterizationHistoryPath } from '../characterization-paths';
import { characterizationSummary } from '../characterization-summary';
import {
  queuedToFormInput,
  serverSummaryLines,
  serverToFormInput,
  varietyOptionsFor,
} from '../characterization-values';
import {
  useQueuedCharacterization,
  useSaveCharacterization,
} from '../use-characterization-queue';
import {
  CharacterizationForm,
  emptyCharacterizationForm,
} from './characterization-form';
import { pageContainerClass } from '@/components/page-container';
import { SyncRejectedNotice } from '@/components/sync-rejected-notice';
import { LoadingBlock } from '@/components/loading-block';

// Lo que la pantalla necesita de la finca y de la parcela. Lo entrega la página, que los lee de
// sus dominios: este no los importa.
export type CharacterizationFarm = {
  id: string;
  name: string;
  detailPath: string;
  isActive: boolean;
};
export type CharacterizationPlot = {
  id: string;
  code: string;
  areaHectares: string;
  isActive: boolean;
};

const SAVE_FAILED =
  'No fue posible guardar la caracterización en el dispositivo. Inténtalo nuevamente.';

export function CharacterizationScreen({
  farm,
  plot,
}: {
  farm: CharacterizationFarm;
  plot: CharacterizationPlot;
}) {
  const { data: user } = useSession();
  const { returnPath, finish } = useFinishSave(farm.detailPath);
  const queued = useQueuedCharacterization(plot.id);
  const server = useFarmCharacterizations(user?.id, farm.id);
  const catalog = useActiveCacaoVarieties(user?.id);
  const save = useSaveCharacterization();
  const sync = useCaptureSyncStatus('caracterizaciones');

  const serverUnreachable = isPausedWithoutData(server);
  const waiting =
    queued.isPending ||
    (catalog.isPending && !isPausedWithoutData(catalog)) ||
    (!queued.data && server.isPending && !serverUnreachable);
  if (waiting) {
    return (
      <LoadingBlock
        className={pageContainerClass('wide', 'space-y-6')}
        label="Cargando caracterización"
        shapes={['h-12 w-2/3', 'h-96']}
      />
    );
  }

  const fromServer = server.data?.data.find((item) => item.plot_id === plot.id);
  const pending = queued.data ?? undefined;
  const { current, expectedVersion, serverCharacterization } =
    characterizationBase(pending, fromServer);
  const defaultValues = pending
    ? queuedToFormInput(pending.fields)
    : fromServer
      ? serverToFormInput(fromServer)
      : emptyCharacterizationForm();
  const options = varietyOptionsFor(
    catalog.data?.data ?? [],
    serverCharacterization,
  );
  const keptVarietyIds = new Set<string>(
    serverCharacterization?.plantings.map((row) => row.variety.id),
  );
  const failed = pending?.status === 'error';
  const blockedMessage = characterizationBlockedMessage({
    farmActive: farm.isActive,
    plotActive: plot.isActive,
    hasCatalog: !!catalog.data,
    syncBlocked: sync.blockedMessage,
  });

  return (
    <div className={pageContainerClass('wide')}>
      <Breadcrumb
        items={[
          { label: 'Fincas', href: '/fincas' },
          { label: farm.name, href: farm.detailPath },
          { label: plot.code },
          { label: 'Caracterización' },
        ]}
      />
      <PageHeader
        description={`Área declarada de la parcela: ${formatHectares(plot.areaHectares)}. Se guarda en este dispositivo y se envía cuando haya conexión.`}
        eyebrow="Caracterización productiva"
        title={
          failed
            ? 'Corregir caracterización'
            : 'Caracterización agronómica de parcela'
        }
        actions={
          // Solo si la ficha ya está en el servidor: sin ella no hay versiones que ver.
          fromServer && (
            <Link
              className={buttonVariants({ size: 'office', variant: 'outline' })}
              href={characterizationHistoryPath(plot.id, farm.id)}
            >
              Ver historial
            </Link>
          )
        }
      />
      {sync.showBanner && (
        <div className="mt-6">
          <OfflineBanner status={sync.status} />
        </div>
      )}
      <CharacterizationNotices
        current={current}
        pending={pending}
        serverSavedAt={server.data?.savedAt}
        serverUnread={server.isError || serverUnreachable}
      />
      <div className="mt-8">
        <CharacterizationForm
          areaHectares={plot.areaHectares}
          blockedMessage={blockedMessage}
          catalog={options}
          defaultValues={defaultValues}
          error={save.isError ? SAVE_FAILED : null}
          isSaving={save.isPending}
          keptVarietyIds={keptVarietyIds}
          onSubmit={(fields) =>
            save.mutate(
              { plotId: plot.id, fields, queued: pending, expectedVersion },
              { onSuccess: () => finish('Caracterización guardada') },
            )
          }
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
          submitLabel={
            failed ? 'Guardar y reenviar' : 'Guardar caracterización'
          }
        />
      </div>
    </div>
  );
}

// Lo que hay que saber antes de editar: que el servidor rechazó lo enviado (y qué tiene él), que no
// se pudo leer la ficha guardada o que se ve la copia del dispositivo.
function CharacterizationNotices({
  pending,
  current,
  serverUnread,
  serverSavedAt,
}: {
  pending: QueuedCharacterization | undefined;
  current: PlotCharacterization | null | undefined;
  serverUnread: boolean;
  serverSavedAt: number | undefined;
}) {
  return (
    <>
      {pending?.status === 'error' && (
        <SyncRejectedNotice errorMessage={pending.errorMessage}>
          {current !== undefined && (
            <p>
              {current
                ? `En el servidor la ficha ahora dice: ${characterizationSummary(serverSummaryLines(current))}.`
                : 'En el servidor la parcela ya no tiene caracterización.'}{' '}
              Si guardas, tus datos reemplazan esa versión.
            </p>
          )}
        </SyncRejectedNotice>
      )}
      {!pending && serverUnread && (
        <p className="mt-6 font-bold text-warn" role="status">
          No pudimos leer la caracterización guardada de esta parcela. Si ya
          tiene una, al sincronizar se te pedirá revisarla.
        </p>
      )}
      {!pending && serverSavedAt !== undefined && (
        <p
          className="mt-6 text-sm font-bold text-muted-foreground"
          role="status"
        >
          Sin conexión: se muestra la caracterización guardada el{' '}
          {formatDateTime(new Date(serverSavedAt).toISOString())}.
        </p>
      )}
    </>
  );
}
