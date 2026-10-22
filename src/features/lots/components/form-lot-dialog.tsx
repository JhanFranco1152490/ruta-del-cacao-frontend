'use client';

import { Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

import { StatusBadge } from '@/components/status-badge';
import { StatusChangeDialog } from '@/components/status-change-dialog';
import { useConfirmAction } from '@/hooks/use-confirm-action';
import { useCurrentPath } from '@/hooks/use-current-path';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useQueueItems } from '@/hooks/use-queue-items';
import { useSession } from '@/hooks/use-session';
import { getErrorMessage, isNotFound } from '@/lib/api/errors';
import { withOrigin } from '@/lib/navigation/origin';
import { notify } from '@/lib/notify';
import { harvestQueueId } from '@/lib/offline/queue-ids';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { existingLotOf, useCreateLot } from '../api';
import { LOT_RESOURCE, queuedLotOf } from '../lot-queue';
import { lotDetailPath } from '../lot-paths';
import {
  type LotSource,
  lotSourceSummary,
  queuedLotLabel,
  queuedLotSummary,
} from '../lot-source';
import { useEnqueueLot } from '../use-lot-queue';

const CREATE_FAILED =
  'No fue posible conformar el lote. Revisa tu conexión e inténtalo nuevamente.';
const QUEUE_FAILED =
  'No fue posible guardar el lote en el dispositivo. Inténtalo nuevamente.';

const createErrorMessage = (error: unknown) =>
  isNotFound(error)
    ? 'Esta cosecha ya no existe.'
    : getErrorMessage(error, CREATE_FAILED);

// Conformar el lote de una cosecha: un resumen, la confirmación y, con conexión y la cosecha ya en
// el servidor, la ficha del lote con su código. Sin conexión, o con la cosecha todavía esperando en
// el teléfono, el lote se guarda también en el dispositivo (con su id, esperando a su cosecha) y
// recibe su código cuando llega al servidor. En una fila de lista va `unavailable` cuando el
// usuario no puede conformarlo; `compact` baja el botón y lo deja de contorno para no pesar más que
// los datos de la fila.
export function FormLotDialog({
  source,
  unavailable,
  returnTo,
  compact = false,
}: {
  source: LotSource;
  unavailable?: ReactNode;
  // A dónde ofrece volver la ficha del lote; por omisión, la pantalla actual. Una pantalla que
  // solo existe tras guardar (la de «Cosecha registrada») da la lista a la que iba a volver.
  returnTo?: string;
  compact?: boolean;
}) {
  const { data: user } = useSession();
  const hasConnection = useHasConnection();
  const queue = useQueueItems(user?.id);
  const router = useRouter();
  const create = useCreateLot();
  const enqueue = useEnqueueLot();
  // La ficha del lote ofrece volver aquí: se conforma desde Cosechas y la ruta de arriba lleva a
  // Lotes.
  const current = useCurrentPath();
  const openLot = (id: string) =>
    router.push(withOrigin(lotDetailPath(id), returnTo ?? current));
  // Uno por diálogo: si la respuesta se pierde, reintentar devuelve el mismo lote.
  const [lotId] = useState(() => crypto.randomUUID());

  const queuedLot = queue
    ?.filter(({ resource }) => resource === LOT_RESOURCE)
    .map(queuedLotOf)
    .find(({ harvestId }) => harvestId === source.harvestId);
  const harvestWaiting = !!queue?.some(
    ({ id }) => id === harvestQueueId(source.harvestId),
  );
  // Directo al servidor solo si hay conexión y la cosecha ya está allá; si no, por la cola.
  const viaQueue = !hasConnection || harvestWaiting;

  const dialog = useConfirmAction(
    async () => {
      if (viaQueue) {
        await enqueue.mutateAsync({
          request: { id: lotId, harvest_id: source.harvestId },
          label: queuedLotLabel(source),
        });
        notify.success('Lote guardado en el teléfono');
        return;
      }
      try {
        const lot = await create.mutateAsync({
          id: lotId,
          harvest_id: source.harvestId,
        });
        notify.success('Lote conformado');
        openLot(lot.id);
      } catch (error) {
        // Otra persona lo conformó primero: se muestra ese lote en vez de un error.
        const existing = existingLotOf(error);
        if (!existing) throw error;
        notify.info(`Esta cosecha ya forma el lote ${existing.code}`);
        openLot(existing.id);
      }
    },
    viaQueue ? () => QUEUE_FAILED : createErrorMessage,
  );

  if (!hasPermission(user, PERMISSIONS.LOTS_ADD)) return unavailable ?? null;
  if (queuedLot) {
    return queuedLot.status === 'error' ? (
      <StatusBadge tone="err">No se pudo enviar el lote</StatusBadge>
    ) : (
      <StatusBadge tone="warn">Lote pendiente de enviar</StatusBadge>
    );
  }
  const action = {
    trigger: 'Conformar lote',
    title: '¿Conformar el lote?',
    description: viaQueue ? queuedLotSummary(source) : lotSourceSummary(source),
    confirm: 'Conformar',
    pending: viaQueue ? 'Guardando…' : 'Conformando…',
    cancel: 'Volver',
    Icon: Package,
    variant: 'default' as const,
  };
  return (
    <StatusChangeDialog
      action={action}
      trigger={action}
      triggerClassName={compact ? 'h-9 text-sm' : undefined}
      triggerSize="office"
      triggerVariant={compact ? 'outline' : undefined}
      {...dialog}
    />
  );
}
