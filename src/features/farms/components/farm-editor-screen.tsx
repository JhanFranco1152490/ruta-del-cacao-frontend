'use client';

import { CircleOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import type { QueuedFarm } from '../farm-queue';
import { queueErrorMessage } from '../queue-error-message';
import { useFarmResubmit, useQueuedFarm } from '../use-farm-queue';
import { FarmFormFields } from './farm-form-fields';

// Por ahora solo corrige fincas que siguen en la cola del dispositivo (pendientes o con
// error). Editar una finca ya sincronizada necesita la API y se suma aquí cuando exista.
export function FarmEditorScreen({ id }: { id: string }) {
  const farm = useQueuedFarm(id);

  if (farm.isPending) {
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

  if (farm.isError) {
    return (
      <FarmUnavailable message="No fue posible leer la finca guardada en este dispositivo." />
    );
  }
  if (!farm.data) {
    return (
      <FarmUnavailable message="Esta finca no está pendiente en este teléfono: ya se sincronizó o se descartó." />
    );
  }

  return <QueuedFarmEditor farm={farm.data} />;
}

function QueuedFarmEditor({ farm }: { farm: QueuedFarm }) {
  const router = useRouter();
  const resubmit = useFarmResubmit();

  return (
    <FarmFormFields
      defaultValues={farm.values}
      title="Corregir finca"
      description="Los cambios se guardan en el teléfono y la finca se vuelve a enviar cuando haya conexión."
      notice={
        farm.status === 'error' && (
          <p
            className="mt-6 rounded-(--radius) bg-err-bg px-4 py-3 font-bold text-err"
            role="alert"
          >
            No se pudo sincronizar
            {farm.errorMessage ? `: ${farm.errorMessage}` : '.'} Corrige los
            datos y guarda para reenviarla.
          </p>
        )
      }
      submitLabel="Guardar y reenviar"
      isSaving={resubmit.isPending}
      error={
        resubmit.isError
          ? queueErrorMessage(
              resubmit.error,
              'No fue posible guardar los cambios en el dispositivo. Inténtalo nuevamente.',
            )
          : null
      }
      onSubmit={(values) =>
        resubmit.mutate(
          { id: farm.id, values },
          { onSuccess: () => router.push('/fincas') },
        )
      }
    />
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
        className={buttonVariants({ size: 'office', className: 'mt-6 px-4' })}
        href="/fincas"
      >
        Volver a mis fincas
      </Link>
    </div>
  );
}
