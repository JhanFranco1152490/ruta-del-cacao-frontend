'use client';

import { useState, type ReactNode } from 'react';

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

type Variant = 'default' | 'destructive';

// Acción que se confirma antes de ejecutarse. Mientras `onConfirm` está en curso no se puede
// cerrar ni repetir; si falla, el diálogo queda abierto con el motivo.
export function ConfirmDialog({
  trigger,
  triggerVariant = 'outline',
  title,
  description,
  confirmLabel,
  pendingLabel,
  variant = 'default',
  onConfirm,
  errorMessage,
}: {
  trigger: ReactNode;
  triggerVariant?: Variant | 'outline';
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  variant?: Variant;
  onConfirm: () => Promise<unknown>;
  errorMessage: (error: unknown) => string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onOpenChange = (next: boolean) => {
    if (isPending) return;
    setOpen(next);
    if (!next) setError(null);
  };

  const confirm = async () => {
    setIsPending(true);
    setError(null);
    try {
      await onConfirm();
      setOpen(false);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogTrigger
        render={<Button className="h-11" variant={triggerVariant} />}
      >
        {trigger}
      </DialogTrigger>
      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
          <Button disabled={isPending} onClick={confirm} variant={variant}>
            {isPending ? pendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
