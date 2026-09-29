'use client';
import { useState } from 'react';
import { UserRoundCheck, UserRoundX } from 'lucide-react';
import {
  StatusChangeDialog,
  type StatusChangeAction,
} from '@/components/status-change-dialog';
import { getErrorMessage } from '@/lib/api/errors';
import { useSetAccountStatus, type Account, type AccountStatus } from '../api';

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

// `last_administrator` y `self_modification` se explican con el mensaje de la API.
export function AccountStatusDialog({
  account,
  onBusy,
}: {
  account: Account;
  onBusy: (value: boolean) => void;
}) {
  const target: AccountStatus =
    account.status === 'inactive' ? 'active' : 'inactive';
  const change = useSetAccountStatus(account.id);
  const [open, setOpen] = useState(false);
  // La acción se congela al abrir: si la cuenta cambia en segundo plano, el texto no cambia.
  const [opened, setOpened] = useState(target);
  function onOpenChange(next: boolean) {
    if (change.isPending) return;
    if (next) setOpened(target);
    setOpen(next);
    if (!next) change.reset();
  }
  function confirm() {
    if (change.isPending) return;
    onBusy(true);
    change.mutate(opened, {
      onSuccess: () => setOpen(false),
      onSettled: () => onBusy(false),
    });
  }
  return (
    <StatusChangeDialog
      trigger={ACTIONS[target]}
      action={ACTIONS[opened]}
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
