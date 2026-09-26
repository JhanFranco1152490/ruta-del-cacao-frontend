'use client';

import { UserRoundCheck, UserRoundX } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import type { Producer, ProducerStatus } from '../api';
import { useProducerStatusChange } from '../use-producer-status-change';

const ACTIONS = {
  inactive: {
    trigger: 'Desactivar',
    title: '¿Desactivar productor?',
    description:
      'El expediente conservará su historial. Si tiene una cuenta vinculada, también se bloqueará su acceso al sistema.',
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
} as const;

type ProducerStatusDialogProps = { producer: Producer; target: ProducerStatus };

export function ProducerStatusDialog({
  producer,
  target,
}: ProducerStatusDialogProps) {
  const { open, dialogTarget, onOpenChange, confirm, isPending, error } =
    useProducerStatusChange(producer, target);
  // El botón de la ficha sigue a la ficha; el contenido del diálogo, a lo que se abrió.
  const trigger = ACTIONS[target];
  const action = ACTIONS[dialogTarget];

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogTrigger
        render={<Button className="h-11" variant={trigger.variant} />}
      >
        <trigger.Icon aria-hidden="true" className="size-4" /> {trigger.trigger}
      </DialogTrigger>
      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>{action.title}</DialogTitle>
          <DialogDescription>{action.description}</DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-sm font-bold text-err" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <DialogClose
            disabled={isPending}
            render={<Button variant="outline" />}
          >
            Cancelar
          </DialogClose>
          <Button
            disabled={isPending}
            onClick={confirm}
            variant={action.variant}
          >
            {isPending ? action.pending : action.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
