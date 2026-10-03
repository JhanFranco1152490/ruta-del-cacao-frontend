'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

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

export type StatusChangeAction = {
  trigger: string;
  title: string;
  description: string;
  confirm: string;
  pending: string;
  Icon: LucideIcon;
  variant: 'default' | 'destructive';
};

type StatusChangeDialogProps = {
  // El botón sigue al estado actual; el contenido, a la acción con la que se abrió.
  trigger: StatusChangeAction;
  action: StatusChangeAction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  error?: string;
  // Detalle de lo que la acción va a hacer, entre la descripción y el aviso de error.
  children?: ReactNode;
};

// Confirmación de activar o desactivar: mientras la petición está en curso no se puede cerrar
// ni volver a confirmar, y un error queda visible sin cerrar el diálogo.
export function StatusChangeDialog({
  trigger,
  action,
  open,
  onOpenChange,
  onConfirm,
  isPending,
  error,
  children,
}: StatusChangeDialogProps) {
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
        {children}
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
            onClick={onConfirm}
            variant={action.variant}
          >
            {isPending ? action.pending : action.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
