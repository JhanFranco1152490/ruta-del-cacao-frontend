'use client';

import { Power, PowerOff } from 'lucide-react';

import { ConfirmDialog } from '@/components/confirm-dialog';

type FarmActivity = 'active' | 'inactive';

const ACTIONS = {
  inactive: {
    trigger: 'Desactivar',
    title: (name: string) => `¿Desactivar la finca ${name}?`,
    description:
      'Dejará de figurar como activa en la operación habitual. Sus datos y su historial se conservan, y puedes volver a activarla cuando quieras.',
    confirm: 'Desactivar finca',
    pending: 'Desactivando…',
    Icon: PowerOff,
    variant: 'destructive',
  },
  active: {
    trigger: 'Activar',
    title: (name: string) => `¿Activar la finca ${name}?`,
    description:
      'Volverá a figurar como activa, con los mismos datos e historial que tenía.',
    confirm: 'Activar finca',
    pending: 'Activando…',
    Icon: Power,
    variant: 'default',
  },
} as const;

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
  const action = ACTIONS[target];

  return (
    <ConfirmDialog
      trigger={
        <>
          <action.Icon aria-hidden="true" className="size-4" /> {action.trigger}
        </>
      }
      triggerVariant={
        action.variant === 'destructive' ? 'destructive' : 'outline'
      }
      title={action.title(farm.name)}
      description={action.description}
      confirmLabel={action.confirm}
      pendingLabel={action.pending}
      variant={action.variant}
      onConfirm={() => onChangeStatus(target)}
      errorMessage={errorMessage}
    />
  );
}
