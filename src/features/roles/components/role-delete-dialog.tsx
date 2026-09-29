'use client';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { getErrorMessage, isApiError } from '@/lib/api/errors';
import { useDeleteRole, type Role } from '../api';

export function RoleDeleteDialog({
  role,
  onDeleted,
  onBusy,
}: {
  role: Role;
  onDeleted: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [failure, setFailure] = useState('');
  const lock = useRef(false);
  const mutation = useDeleteRole();
  async function confirm() {
    if (lock.current) return;
    lock.current = true;
    onBusy(true);
    setFailure('');
    try {
      await mutation.mutateAsync(role.id);
      setOpen(false);
      onDeleted();
    } catch (error) {
      setFailure(
        isApiError(error) && error.code === 'role_in_use'
          ? 'Este rol tiene cuentas asignadas. Retíralo de esas cuentas antes de borrarlo.'
          : isApiError(error) && error.code === 'exceeds_own_permissions'
            ? 'Ya no tienes permiso para borrar este rol.'
            : getErrorMessage(
                error,
                'No fue posible borrar el rol. Inténtalo nuevamente.',
              ),
      );
    } finally {
      lock.current = false;
      onBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!lock.current) {
          setOpen(value);
          setFailure('');
        }
      }}
    >
      <DialogTrigger render={<Button variant="destructive" />}>
        Borrar rol
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>¿Borrar rol?</DialogTitle>
          <DialogDescription>
            Se eliminará el rol «{role.name}». Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        {failure && (
          <p role="alert" className="text-err">
            {failure}
          </p>
        )}
        <DialogFooter>
          <DialogClose
            disabled={mutation.isPending}
            render={<Button variant="outline" />}
          >
            Cancelar
          </DialogClose>
          <Button
            variant="destructive"
            disabled={mutation.isPending}
            onClick={confirm}
          >
            {mutation.isPending ? 'Borrando…' : 'Confirmar borrado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
