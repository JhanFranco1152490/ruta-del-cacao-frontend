'use client';

import { Power, PowerOff } from 'lucide-react';

import {
  StatusChangeDialog,
  type StatusChangeAction,
} from '@/components/status-change-dialog';

import { useConfirmAction } from '../use-confirm-action';

type FarmActivity = 'active' | 'inactive';

function actionFor(target: FarmActivity, name: string): StatusChangeAction {
  return target === 'inactive'
    ? {
        trigger: 'Desactivar',
        title: `¿Desactivar la finca ${name}?`,
        description:
          'Dejará de figurar como activa en la operación habitual. Sus datos y su historial se conservan, y puedes volver a activarla cuando quieras.',
        confirm: 'Desactivar finca',
        pending: 'Desactivando…',
        Icon: PowerOff,
        variant: 'destructive',
      }
    : {
        trigger: 'Activar',
        title: `¿Activar la finca ${name}?`,
        description:
          'Volverá a figurar como activa, con los mismos datos e historial que tenía.',
        confirm: 'Activar finca',
        pending: 'Activando…',
        Icon: Power,
        variant: 'default',
      };
}

// Solo para fincas que ya están en el servidor: una pendiente todavía no tiene estado que
// cambiar. `onChangeStatus` hace el cambio real y rechaza si falla.
export function FarmStatusDialog({
  farm,
  onChangeStatus,
  errorMessage = () =>
    'No fue posible cambiar el estado de la finca. Inténtalo nuevamente.',
}: {
  farm: { name: string; status: FarmActivity };
  onChangeStatus: (target: FarmActivity) => Promise<unknown>;
  errorMessage?: (error: unknown) => string;
}) {
  const target = farm.status === 'active' ? 'inactive' : 'active';
  const action = actionFor(target, farm.name);
  const dialog = useConfirmAction(() => onChangeStatus(target), errorMessage);

  return <StatusChangeDialog trigger={action} action={action} {...dialog} />;
}
