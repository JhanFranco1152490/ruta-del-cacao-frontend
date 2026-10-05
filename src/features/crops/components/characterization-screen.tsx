'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { OfflineBanner } from '@/components/offline-banner';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCaptureSyncStatus } from '@/hooks/use-capture-sync-status';
import { useSession } from '@/hooks/use-session';
import { queryKeys } from '@/lib/api/query-keys';
import { formatDateTime } from '@/lib/format/dates';
import { formatHectares } from '@/lib/format/hectares';
import { isPausedWithoutData } from '@/lib/offline/paused-read';

import {
  type PlotCharacterization,
  useActiveCacaoVarieties,
  useFarmCharacterizations,
} from '../api';
import type { QueuedCharacterization } from '../characterization-queue';
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
import { CharacterizationSavedPanel } from './characterization-saved-panel';

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

export const NO_CATALOG_MESSAGE =
  'Necesitas conexión una vez para cargar las variedades de cacao.';
const SAVE_FAILED =
  'No fue posible guardar la caracterización en el dispositivo. Inténtalo nuevamente.';

// La ficha que trae `stale_version` con el error: la vigente en el servidor, o null si allá la
// parcela no tiene.
function staleCurrent(
  queued: QueuedCharacterization | null | undefined,
): PlotCharacterization | null | undefined {
  if (queued?.errorCode !== 'stale_version') return undefined;
  const data = queued.errorData as
    { current?: PlotCharacterization | null } | undefined;
  return data?.current ?? null;
}

export function CharacterizationScreen({
  farm,
  plot,
}: {
  farm: CharacterizationFarm;
  plot: CharacterizationPlot;
}) {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const queued = useQueuedCharacterization(plot.id);
  const server = useFarmCharacterizations(user?.id, farm.id);
  const catalog = useActiveCacaoVarieties(user?.id);
  const save = useSaveCharacterization();
  const sync = useCaptureSyncStatus('caracterizaciones');
  const [saved, setSaved] = useState(false);
  // Al corregir después de guardar se monta un formulario nuevo con lo que quedó en la cola.
  const [round, setRound] = useState(0);

  if (saved) {
    return (
      <CharacterizationSavedPanel
        farmDetailPath={farm.detailPath}
        onCorrect={() => {
          void queryClient
            .invalidateQueries({
              queryKey: queryKeys.characterizations.queued(
                user?.id ?? '',
                plot.id,
              ),
            })
            .then(() => {
              setRound((value) => value + 1);
              setSaved(false);
            });
        }}
        plotCode={plot.code}
        plotId={plot.id}
      />
    );
  }

  const serverUnreachable = isPausedWithoutData(server);
  const waiting =
    queued.isPending ||
    (catalog.isPending && !isPausedWithoutData(catalog)) ||
    (!queued.data && server.isPending && !serverUnreachable);
  if (waiting) {
    return (
      <div
        aria-label="Cargando caracterización"
        className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-8"
        role="status"
      >
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const fromServer = server.data?.data.find((item) => item.plot_id === plot.id);
  const pending = queued.data ?? undefined;
  const current = staleCurrent(pending);
  // La versión con la que se envía: la de la ficha vigente que trajo el error, la que se leyó
  // del servidor para una pendiente, o la de la ficha guardada.
  const expectedVersion =
    current !== undefined
      ? (current?.version ?? null)
      : pending
        ? pending.expectedVersion
        : (fromServer?.version ?? null);
  const defaultValues = pending
    ? queuedToFormInput(pending.fields)
    : fromServer
      ? serverToFormInput(fromServer)
      : emptyCharacterizationForm();
  // La ficha del servidor contra la que se guarda: la que trajo el conflicto o la leída.
  const serverCharacterization = current ?? fromServer;
  const options = varietyOptionsFor(
    catalog.data?.data ?? [],
    serverCharacterization,
  );
  const keptVarietyIds = new Set<string>(
    serverCharacterization?.plantings.map((row) => row.variety.id),
  );
  const failed = pending?.status === 'error';
  const blockedMessage = !farm.isActive
    ? 'La finca está inactiva: la caracterización de sus parcelas no se puede editar. Reactívala para continuar.'
    : !plot.isActive
      ? 'La parcela está inactiva: su caracterización no se puede editar. Reactívala para continuar.'
      : !catalog.data
        ? NO_CATALOG_MESSAGE
        : sync.blockedMessage;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">
      <nav aria-label="Ruta de navegación" className="text-sm">
        <Link className="font-bold text-cobre underline" href={farm.detailPath}>
          {farm.name}
        </Link>{' '}
        <span aria-hidden="true">›</span> {plot.code}
      </nav>
      <PageHeader
        description={`Área declarada de la parcela: ${formatHectares(plot.areaHectares)}. Se guarda en este dispositivo y se envía cuando haya conexión.`}
        eyebrow="Caracterización productiva"
        title={
          failed
            ? 'Corregir caracterización'
            : 'Caracterización agronómica de parcela'
        }
      />
      {sync.showBanner && (
        <div className="mt-6">
          <OfflineBanner status={sync.status} />
        </div>
      )}
      {failed && (
        <div
          className="mt-6 space-y-2 rounded-(--radius) bg-err-bg px-4 py-3 font-bold text-err"
          role="alert"
        >
          <p>
            No se pudo sincronizar
            {pending.errorMessage ? `: ${pending.errorMessage}` : '.'}
          </p>
          {current !== undefined && (
            <p>
              {current
                ? `En el servidor la ficha ahora dice: ${characterizationSummary(serverSummaryLines(current))}.`
                : 'En el servidor la parcela ya no tiene caracterización.'}{' '}
              Si guardas, tus datos reemplazan esa versión.
            </p>
          )}
        </div>
      )}
      {!pending && (server.isError || serverUnreachable) && (
        <p className="mt-6 font-bold text-warn" role="status">
          No pudimos leer la caracterización guardada de esta parcela. Si ya
          tiene una, al sincronizar se te pedirá revisarla.
        </p>
      )}
      {!pending && server.data?.savedAt !== undefined && (
        <p
          className="mt-6 text-sm font-bold text-muted-foreground"
          role="status"
        >
          Sin conexión: se muestra la caracterización guardada el{' '}
          {formatDateTime(new Date(server.data.savedAt).toISOString())}.
        </p>
      )}
      <div className="mt-8">
        <CharacterizationForm
          areaHectares={plot.areaHectares}
          blockedMessage={blockedMessage}
          catalog={options}
          defaultValues={defaultValues}
          error={save.isError ? SAVE_FAILED : null}
          isSaving={save.isPending}
          keptVarietyIds={keptVarietyIds}
          key={round}
          onSubmit={(fields) =>
            save.mutate(
              { plotId: plot.id, fields, queued: pending, expectedVersion },
              { onSuccess: () => setSaved(true) },
            )
          }
          secondaryAction={
            <Link
              className={buttonVariants({
                size: 'office',
                variant: 'outline',
                className: CAPTURE_BUTTON_CLASS,
              })}
              href={farm.detailPath}
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
