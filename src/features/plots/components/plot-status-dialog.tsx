'use client';

import { Power, PowerOff } from 'lucide-react';

import {
  type StatusChangeAction,
  StatusChangeDialog,
} from '@/components/status-change-dialog';
import {
  type ConfirmControl,
  useConfirmAction,
} from '@/hooks/use-confirm-action';
import { getErrorMessage, isApiError } from '@/lib/api/errors';
import { notify } from '@/lib/notify';

import type { KnownPlot } from '../known-plots';
import { useChangePlotStatus } from '../api';

const actionFor = (
  target: 'active' | 'inactive',
  code: string,
): StatusChangeAction =>
  target === 'inactive'
    ? {
        trigger: 'Desactivar',
        title: `¿Desactivar la parcela ${code}?`,
        description:
          'Libera su área y deja de contar para la superposición. Sus datos y su historial se conservan, y puedes volver a activarla.',
        confirm: 'Desactivar parcela',
        pending: 'Desactivando…',
        Icon: PowerOff,
        variant: 'destructive',
      }
    : {
        trigger: 'Activar',
        title: `¿Activar la parcela ${code}?`,
        description:
          'Vuelve a ocupar su área y a contar para la superposición: se comprueban de nuevo las dos reglas.',
        confirm: 'Activar parcela',
        pending: 'Activando…',
        Icon: Power,
        variant: 'default',
      };

const REJECTED_ON_REACTIVATION = ['plot_overlap', 'plot_area_exceeds_farm'];

export function statusErrorMessage(error: unknown, isReactivating: boolean) {
  if (isApiError(error)) {
    if (error.code === 'stale_version') {
      return 'Alguien cambió esta parcela mientras tanto. Cierra el diálogo y vuelve a intentarlo con los datos actualizados.';
    }
    // Reactivar valida el área y la superposición: se pide editar la parcela primero.
    if (isReactivating && REJECTED_ON_REACTIVATION.includes(error.code)) {
      return `${error.message} Edita la parcela primero para corregirlo.`;
    }
    if (error.code === 'farm_inactive') {
      return 'La finca está inactiva: sus parcelas no se pueden activar ni desactivar.';
    }
  }
  return getErrorMessage(
    error,
    'No fue posible cambiar el estado de la parcela. Revisa tu conexión e inténtalo nuevamente.',
  );
}

// Solo para parcelas que ya están en el servidor y sin cambios pendientes: la versión leída evita
// pisar un cambio ajeno. Es en línea: la persona necesita ver el resultado en el momento.
export function PlotStatusDialog({
  plot,
  farmId,
  control,
}: {
  plot: KnownPlot & { version: number };
  farmId: string;
  // Abierto desde un menú de acciones: sin botón propio.
  control?: ConfirmControl;
}) {
  const changeStatus = useChangePlotStatus();
  const target = plot.isActive ? 'inactive' : 'active';
  const action = actionFor(target, plot.code);
  const dialog = useConfirmAction(
    async () => {
      await changeStatus.mutateAsync({
        id: plot.id,
        farmId,
        isActive: target === 'active',
        expectedVersion: plot.version,
      });
      notify.success(
        target === 'active' ? 'Parcela activada' : 'Parcela desactivada',
      );
    },
    (error) => statusErrorMessage(error, target === 'active'),
    control,
  );

  return (
    <StatusChangeDialog
      trigger={control ? undefined : action}
      action={action}
      {...dialog}
    />
  );
}
