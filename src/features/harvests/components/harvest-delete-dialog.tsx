'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { StatusChangeDialog } from '@/components/status-change-dialog';
import { useConfirmAction } from '@/hooks/use-confirm-action';
import { getErrorMessage, isApiError } from '@/lib/api/errors';
import { formatLongDate } from '@/lib/format/dates';
import { plotLabel } from '@/lib/format/place-label';
import { notify } from '@/lib/notify';

import { type Harvest, HARVEST_ERROR, useDeleteHarvest } from '../api';
import { HARVESTS_PATH } from '../harvest-paths';

const DELETE_FAILED =
  'No fue posible eliminar la cosecha. Revisa tu conexión e inténtalo nuevamente.';

function deleteErrorMessage(error: unknown) {
  if (!isApiError(error)) return DELETE_FAILED;
  if (error.status === 404) return 'Esta cosecha ya no existe.';
  if (error.code === HARVEST_ERROR.staleVersion) {
    return 'Otra persona cambió esta cosecha. Revisa sus datos actuales antes de eliminarla.';
  }
  if (error.code === HARVEST_ERROR.inLot) {
    return 'Esta cosecha ya forma un lote: no se puede eliminar.';
  }
  return getErrorMessage(error, DELETE_FAILED);
}

// Eliminar una cosecha registrada por error, mientras no forme un lote. Solo en línea, con la
// versión leída; al terminar vuelve a la lista. `harvest` se vuelve a leer tras cada intento:
// después de una versión obsoleta, el siguiente va con la vigente.
export function HarvestDeleteDialog({ harvest }: { harvest: Harvest }) {
  const remove = useDeleteHarvest();
  const router = useRouter();
  const dialog = useConfirmAction(async () => {
    await remove.mutateAsync({
      id: harvest.id,
      expectedVersion: harvest.version,
    });
    notify.success('Cosecha eliminada');
    router.replace(HARVESTS_PATH);
  }, deleteErrorMessage);
  const action = {
    trigger: 'Eliminar',
    title: '¿Eliminar esta cosecha?',
    description: `La recolección de ${plotLabel(harvest.plot)} del ${formatLongDate(harvest.harvest_date)}. Esta acción no se puede deshacer.`,
    confirm: 'Eliminar cosecha',
    pending: 'Eliminando…',
    Icon: Trash2,
    variant: 'destructive' as const,
  };

  return <StatusChangeDialog action={action} trigger={action} {...dialog} />;
}
