'use client';

import { cn } from 'cn';
import { CircleOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { OfflineBanner } from '@/components/offline-banner';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { isApiError } from '@/lib/api/errors';

import { type Farm, useFarm } from '../api';
import { farmToFormValues, type QueuedFarm } from '../farm-queue';
import { queueErrorMessage } from '../queue-error-message';
import {
  useFarmResubmit,
  useFarmUpdate,
  useQueuedFarm,
} from '../use-farm-queue';
import { useFarmSyncStatus } from '../use-farm-sync-status';
import { CAPTURE_BUTTON_CLASS } from './capture-field-class';
import { FarmFormFields } from './farm-form-fields';
import { FarmStaleVersionSummary } from './farm-stale-version-summary';

// Sin revalidación automática: el formulario se inicializa una sola vez con esta lectura, y
// volver a pedir la finca (foco, reconexión) solo produciría datos que el formulario no adopta.
const EDITOR_QUERY_OPTIONS = { staleTime: Infinity };

const SAVE_FAILED =
  'No fue posible guardar los cambios en el dispositivo. Inténtalo nuevamente.';

// Lo que sigue en la cola del dispositivo se edita ahí mismo; si no hay nada pendiente, se
// edita la finca del servidor.
export function FarmEditorScreen({ id }: { id: string }) {
  const queued = useQueuedFarm(id);

  if (queued.isPending) return <EditorSkeleton />;
  if (queued.isError) {
    return (
      <FarmUnavailable message="No fue posible leer la finca guardada en este dispositivo." />
    );
  }
  if (queued.data) return <QueuedFarmEditor farm={queued.data} />;
  return <ServerFarmEditor id={id} />;
}

function ServerFarmEditor({ id }: { id: string }) {
  const farm = useFarm(id, EDITOR_QUERY_OPTIONS);

  // Sin conexión la consulta queda en pausa: se explica en vez de cargar sin fin.
  if (farm.isPending && farm.fetchStatus === 'paused') {
    return (
      <FarmUnavailable message="Necesitas conexión para editar esta finca: sus datos no están guardados en este dispositivo." />
    );
  }
  if (farm.isPending) return <EditorSkeleton />;
  if (farm.isError) {
    return (
      <FarmUnavailable
        message={
          isApiError(farm.error) && farm.error.status === 404
            ? 'No encontramos esta finca entre las tuyas.'
            : 'No fue posible cargar la finca. Revisa tu conexión e inténtalo nuevamente.'
        }
      />
    );
  }
  return <SavedFarmEditor farm={farm.data} />;
}

function SavedFarmEditor({ farm }: { farm: Farm }) {
  const router = useRouter();
  const update = useFarmUpdate();
  const sync = useFarmSyncStatus();

  return (
    <FarmFormFields
      defaultValues={farmToFormValues(farm)}
      title="Editar finca"
      description="Los cambios se guardan en este dispositivo y se envían cuando haya conexión."
      banner={<OfflineBanner status={sync.status} />}
      blockedMessage={sync.blockedMessage}
      submitLabel="Guardar cambios"
      isSaving={update.isPending}
      error={
        update.isError ? queueErrorMessage(update.error, SAVE_FAILED) : null
      }
      onSubmit={(values) =>
        update.mutate(
          { id: farm.id, values, expectedVersion: farm.version },
          { onSuccess: () => router.push('/fincas') },
        )
      }
    />
  );
}

function QueuedFarmEditor({ farm }: { farm: QueuedFarm }) {
  const router = useRouter();
  const resubmit = useFarmResubmit();
  const sync = useFarmSyncStatus();
  const isStale = farm.errorCode === 'stale_version';
  // Una edición rechazada por versión obsoleta se reenvía con la versión vigente, y solo
  // después de que la persona la vea: así decide a conciencia en vez de pisar el cambio ajeno.
  const current = useFarm(farm.id, {
    enabled: isStale,
    ...EDITOR_QUERY_OPTIONS,
  });
  const failed = farm.status === 'error';

  return (
    <FarmFormFields
      defaultValues={farm.values}
      title={failed ? 'Corregir finca' : 'Editar finca'}
      description="Los cambios se guardan en este dispositivo y la finca se vuelve a enviar cuando haya conexión."
      banner={<OfflineBanner status={sync.status} />}
      notice={
        failed && (
          <div
            className="mt-6 space-y-2 rounded-(--radius) bg-err-bg px-4 py-3 font-bold text-err"
            role="alert"
          >
            <p>
              No se pudo sincronizar
              {farm.errorMessage ? `: ${farm.errorMessage}` : '.'}
            </p>
            {isStale && current.data ? (
              <FarmStaleVersionSummary
                current={current.data}
                mine={farm.values}
              />
            ) : (
              <p>Corrige los datos y guarda para reenviarla.</p>
            )}
          </div>
        )
      }
      blockedMessage={
        sync.blockedMessage ??
        (isStale && !current.data
          ? 'Necesitas conexión para ver la versión vigente de la finca antes de reenviar tus cambios.'
          : null)
      }
      submitLabel={failed ? 'Guardar y reenviar' : 'Guardar cambios'}
      isSaving={resubmit.isPending}
      error={
        resubmit.isError ? queueErrorMessage(resubmit.error, SAVE_FAILED) : null
      }
      onSubmit={(values) =>
        resubmit.mutate(
          { farm, values, expectedVersion: current.data?.version },
          { onSuccess: () => router.push('/fincas') },
        )
      }
    />
  );
}

function EditorSkeleton() {
  return (
    <div
      aria-label="Cargando finca"
      className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-8"
      role="status"
    >
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-96" />
    </div>
  );
}

function FarmUnavailable({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16 text-center sm:px-8">
      <CircleOff aria-hidden="true" className="mx-auto size-10 text-err" />
      <h1 className="mt-4 text-3xl text-selva">
        No fue posible abrir la finca
      </h1>
      <p className="mt-3 text-muted-foreground" role="alert">
        {message}
      </p>
      <Link
        className={buttonVariants({
          size: 'office',
          className: cn(CAPTURE_BUTTON_CLASS, 'mt-6'),
        })}
        href="/fincas"
      >
        Volver a mis fincas
      </Link>
    </div>
  );
}
