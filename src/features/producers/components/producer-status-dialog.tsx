'use client';

import { UserRoundCheck, UserRoundX } from 'lucide-react';

import {
  StatusChangeDialog,
  type StatusChangeAction,
} from '@/components/status-change-dialog';

import type { Producer, ProducerStatus } from '../api';
import { useProducerStatusChange } from '../use-producer-status-change';

const ACTIONS: Record<ProducerStatus, StatusChangeAction> = {
  inactive: {
    trigger: 'Desactivar',
    title: '¿Desactivar productor?',
    description:
      'El expediente conservará su historial. Si tiene cuenta, también se bloqueará el acceso de su cuenta y el de sus empleados.',
    confirm: 'Desactivar productor',
    pending: 'Desactivando…',
    Icon: UserRoundX,
    variant: 'destructive',
  },
  active: {
    trigger: 'Reactivar',
    title: '¿Reactivar productor?',
    description:
      'El productor volverá a figurar como activo y su expediente podrá editarse con normalidad.',
    confirm: 'Reactivar productor',
    pending: 'Reactivando…',
    Icon: UserRoundCheck,
    variant: 'default',
  },
};

type ProducerStatusDialogProps = { producer: Producer; target: ProducerStatus };

export function ProducerStatusDialog({
  producer,
  target,
}: ProducerStatusDialogProps) {
  const { open, dialogTarget, onOpenChange, confirm, isPending, error } =
    useProducerStatusChange(producer, target);
  return (
    <StatusChangeDialog
      trigger={ACTIONS[target]}
      action={ACTIONS[dialogTarget]}
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={confirm}
      isPending={isPending}
      error={error}
    />
  );
}
