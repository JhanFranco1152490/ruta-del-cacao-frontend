'use client';
import { useState } from 'react';
import { UserRoundCheck, UserRoundX } from 'lucide-react';
import {
  StatusChangeDialog,
  type StatusChangeAction,
} from '@/components/status-change-dialog';
import { getErrorMessage } from '@/lib/api/errors';
import {
  useSetAccountStatus,
  type Account,
  type AccountStatus,
} from '@/lib/api/accounts';
import { notify } from '@/lib/notify';

const ACTIONS: Record<AccountStatus, StatusChangeAction> = {
  inactive: {
    trigger: 'Desactivar',
    title: '¿Desactivar cuenta?',
    description:
      'La persona perderá el acceso de inmediato. La cuenta se conserva y puede reactivarse.',
    confirm: 'Desactivar cuenta',
    pending: 'Desactivando…',
    Icon: UserRoundX,
    variant: 'destructive',
  },
  active: {
    trigger: 'Reactivar',
    title: '¿Reactivar cuenta?',
    description:
      'La persona podrá volver a iniciar sesión con los roles que tiene asignados.',
    confirm: 'Reactivar cuenta',
    pending: 'Reactivando…',
    Icon: UserRoundCheck,
    variant: 'default',
  },
};

// La cuenta Productor de un productor inactivo no tiene acceso aunque esté activa: reactivarla
// reactiva también al productor, y eso es lo que se ofrece en vez de desactivarla.
const REACTIVATE_WITH_PRODUCER: StatusChangeAction = {
  ...ACTIONS.active,
  description:
    'La persona podrá volver a iniciar sesión. También se reactivará el productor y vuelve el acceso de sus empleados.',
};

const actionOf = (target: AccountStatus, reactivatesProducer: boolean) =>
  reactivatesProducer ? REACTIVATE_WITH_PRODUCER : ACTIONS[target];

// `last_administrator` y `self_modification` se explican con el mensaje de la API.
export function AccountStatusDialog({
  account,
  reactivatesProducer = false,
  onBusy,
  onChanged,
}: {
  account: Pick<Account, 'id' | 'status'>;
  // Es la cuenta Productor y su productor está inactivo.
  reactivatesProducer?: boolean;
  onBusy: (value: boolean) => void;
  // Quien muestra la cuenta en otra vista (la ficha del productor) la refresca aquí.
  onChanged?: () => void;
}) {
  const target: AccountStatus =
    reactivatesProducer || account.status === 'inactive'
      ? 'active'
      : 'inactive';
  const change = useSetAccountStatus(account.id);
  const [open, setOpen] = useState(false);
  // La acción se congela al abrir: si la cuenta cambia en segundo plano, el texto no cambia.
  const [opened, setOpened] = useState({ target, reactivatesProducer });
  function onOpenChange(next: boolean) {
    if (change.isPending) return;
    if (next) setOpened({ target, reactivatesProducer });
    setOpen(next);
    if (!next) change.reset();
  }
  function confirm() {
    if (change.isPending) return;
    onBusy(true);
    change.mutate(opened.target, {
      onSuccess: () => {
        setOpen(false);
        notify.success(
          opened.reactivatesProducer
            ? 'Cuenta y productor reactivados'
            : opened.target === 'active'
              ? 'Cuenta activada'
              : 'Cuenta desactivada',
        );
        onChanged?.();
      },
      onSettled: () => onBusy(false),
    });
  }
  return (
    <StatusChangeDialog
      trigger={actionOf(target, reactivatesProducer)}
      action={actionOf(opened.target, opened.reactivatesProducer)}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={confirm}
      isPending={change.isPending}
      error={
        change.isError
          ? getErrorMessage(
              change.error,
              'No fue posible cambiar el estado de la cuenta. Inténtalo nuevamente.',
            )
          : undefined
      }
    />
  );
}
