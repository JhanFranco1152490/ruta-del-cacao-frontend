'use client';

import { Trash2 } from 'lucide-react';

import { StatusChangeDialog } from '@/components/status-change-dialog';
import { useConfirmAction } from '@/hooks/use-confirm-action';
import { getErrorMessage, isApiError, isNotFound } from '@/lib/api/errors';
import { formatWeekdayDate } from '@/lib/format/dates';

import { activityTitle } from '../activity-labels';
import {
  ACTIVITY_ERROR,
  type AgriculturalActivity,
  useDeleteActivity,
} from '../api';

export const ACTIVITY_DELETED_MESSAGE = 'Actividad eliminada';
export const ACTIVITY_GONE_MESSAGE = 'Esta actividad ya no existe.';
const DELETE_FAILED_MESSAGE =
  'No fue posible eliminar la actividad. Revisa tu conexión e inténtalo nuevamente.';

// La actividad dejó de poder eliminarse (ya se realizó, venció o alguien la eliminó): no hay nada
// que reintentar en este diálogo.
const isFinal = (error: unknown) =>
  isApiError(error) &&
  (error.status === 404 ||
    error.code === ACTIVITY_ERROR.alreadyDone ||
    error.code === ACTIVITY_ERROR.overdue);

function retryMessage(error: unknown) {
  if (isApiError(error) && error.code === ACTIVITY_ERROR.staleVersion) {
    return 'Otra persona cambió esta actividad. Revisa sus datos actuales antes de eliminarla.';
  }
  return getErrorMessage(error, DELETE_FAILED_MESSAGE);
}

// Eliminar es solo para una actividad programada por error. `activity` llega de la lista, que se
// vuelve a leer tras cada intento: después de una versión obsoleta, el siguiente va con la vigente.
export function ActivityDeleteDialog({
  activity,
  onClose,
  onDone,
  onRejected,
}: {
  activity: AgriculturalActivity;
  onClose: () => void;
  onDone: (message: string) => void;
  // La actividad ya no se puede eliminar: el diálogo se cierra con el motivo.
  onRejected: (message: string) => void;
}) {
  const remove = useDeleteActivity();
  const dialog = useConfirmAction(async () => {
    try {
      await remove.mutateAsync({
        id: activity.id,
        expectedVersion: activity.version,
      });
    } catch (error) {
      if (!isFinal(error)) throw error;
      onRejected(
        isNotFound(error)
          ? ACTIVITY_GONE_MESSAGE
          : getErrorMessage(error, DELETE_FAILED_MESSAGE),
      );
      return;
    }
    onDone(ACTIVITY_DELETED_MESSAGE);
  }, retryMessage);

  return (
    <StatusChangeDialog
      {...dialog}
      action={{
        trigger: 'Eliminar',
        title: '¿Eliminar esta actividad?',
        description: `${activityTitle(activity)} en ${activity.plot.code}, programada para el ${formatWeekdayDate(activity.scheduled_date)}. Se quitará del calendario. Esta acción no se puede deshacer.`,
        confirm: 'Eliminar actividad',
        pending: 'Eliminando…',
        Icon: Trash2,
        variant: 'destructive',
      }}
      onOpenChange={(open) => {
        if (!open && !dialog.isPending) onClose();
      }}
      open
    >
      <p className="text-sm text-muted-foreground">
        Si solo cambió la fecha o el responsable, mejor edítala.
      </p>
    </StatusChangeDialog>
  );
}
