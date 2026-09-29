'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';

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

import type { FarmListItem } from '../farm-list-item';
import { queueErrorMessage } from '../queue-error-message';
import { useFarmDiscard } from '../use-farm-queue';

export function FarmDiscardDialog({ farm }: { farm: FarmListItem }) {
  const [open, setOpen] = useState(false);
  const discard = useFarmDiscard();

  const onOpenChange = (next: boolean) => {
    if (discard.isPending) return;
    setOpen(next);
    if (!next) discard.reset();
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogTrigger render={<Button className="h-11" variant="destructive" />}>
        <Trash2 aria-hidden="true" className="size-4" /> Descartar
      </DialogTrigger>
      <DialogContent showCloseButton={!discard.isPending}>
        <DialogHeader>
          <DialogTitle>¿Descartar la finca {farm.name}?</DialogTitle>
          <DialogDescription>
            Se borrará de este teléfono y no se enviará al servidor. Esta acción
            no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        {discard.isError && (
          <p className="text-sm font-bold text-err" role="alert">
            {queueErrorMessage(
              discard.error,
              'No fue posible descartar la finca. Inténtalo nuevamente.',
            )}
          </p>
        )}
        <DialogFooter>
          <DialogClose
            disabled={discard.isPending}
            render={<Button variant="outline" />}
          >
            Cancelar
          </DialogClose>
          <Button
            disabled={discard.isPending}
            onClick={() =>
              discard.mutate(farm.id, { onSuccess: () => setOpen(false) })
            }
            variant="destructive"
          >
            {discard.isPending ? 'Descartando…' : 'Descartar finca'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
