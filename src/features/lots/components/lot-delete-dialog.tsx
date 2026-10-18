'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { StatusChangeDialog } from '@/components/status-change-dialog';
import { useConfirmAction } from '@/hooks/use-confirm-action';
import { getErrorMessage, isApiError } from '@/lib/api/errors';
import { notify } from '@/lib/notify';

import { type Lot, LOT_ERROR, useDeleteLot } from '../api';
import { LOTS_PATH } from '../lot-paths';

const DELETE_FAILED =
  'No fue posible eliminar el lote. Revisa tu conexión e inténtalo nuevamente.';

function deleteErrorMessage(error: unknown) {
  if (!isApiError(error)) return DELETE_FAILED;
  if (error.status === 404) return 'Este lote ya no existe.';
  if (error.code === LOT_ERROR.staleVersion) {
    return 'Otra persona cambió este lote. Revisa sus datos actuales antes de eliminarlo.';
  }
  if (error.code === LOT_ERROR.invalidStatus) {
    return 'Este lote ya tiene proceso registrado: solo se elimina un lote Generado.';
  }
  return getErrorMessage(error, DELETE_FAILED);
}

// Eliminar un lote conformado por error, mientras siga Generado. Solo en línea, con la versión
// leída; la cosecha queda sin lote y el código no se vuelve a usar.
export function LotDeleteDialog({ lot }: { lot: Lot }) {
  const remove = useDeleteLot();
  const router = useRouter();
  const dialog = useConfirmAction(async () => {
    await remove.mutateAsync({ id: lot.id, expectedVersion: lot.version });
    notify.success('Lote eliminado');
    router.replace(LOTS_PATH);
  }, deleteErrorMessage);
  const action = {
    trigger: 'Eliminar',
    title: `¿Eliminar el lote ${lot.code}?`,
    description:
      'La cosecha quedará sin lote y el código no se volverá a usar. Esta acción no se puede deshacer.',
    confirm: 'Eliminar lote',
    pending: 'Eliminando…',
    Icon: Trash2,
    variant: 'destructive' as const,
  };

  return <StatusChangeDialog action={action} trigger={action} {...dialog} />;
}
