'use client';
import { useId, useState } from 'react';
import { ErrorState } from '@/components/error-state';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { getErrorMessage } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/format/dates';
import { useAssociationAccess, useSetAssociationAccess } from '../api';

// Interruptor con el que el productor deja (o no) que la asociación gestione sus cuentas y
// roles. El estado mostrado es siempre el del servidor: si el cambio falla, no se mueve.
export function AssociationAccessCard() {
  const access = useAssociationAccess();
  const change = useSetAssociationAccess();
  const [confirming, setConfirming] = useState(false);
  const labelId = useId();
  const helpId = useId();
  if (access.isPending)
    return <p role="status">Cargando acceso de la asociación…</p>;
  if (access.isError)
    return (
      <ErrorState
        message="No fue posible consultar el acceso de la asociación."
        onRetry={() => {
          void access.refetch();
        }}
      />
    );
  const { enabled, changed_at: changedAt } = access.data;
  function send(next: boolean) {
    if (change.isPending) return;
    change.mutate(next, { onSuccess: () => setConfirming(false) });
  }
  return (
    <section
      aria-labelledby={labelId}
      className="rounded-lg bg-card p-5 shadow-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-prose space-y-2">
          <h2 id={labelId} className="font-serif text-xl text-selva">
            Permitir que la asociación gestione mis cuentas y roles
          </h2>
          <p id={helpId} className="text-sm text-muted-foreground">
            Encendido, el Administrador de la asociación puede ver y gestionar
            las cuentas de tus empleados y tus roles propios. Solo afecta esa
            gestión: no cambia qué información de tus fincas consulta la
            asociación.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge tone={enabled ? 'ok' : 'warn'}>
            {enabled ? 'Encendido' : 'Apagado'}
          </StatusBadge>
          <Switch
            checked={enabled}
            disabled={change.isPending}
            aria-labelledby={labelId}
            aria-describedby={helpId}
            // Encender pide confirmación; apagar no, porque devuelve el control al productor.
            onCheckedChange={(next) => {
              change.reset();
              if (next) setConfirming(true);
              else send(false);
            }}
          />
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {changedAt
          ? `Último cambio: ${formatDateTime(changedAt)}`
          : 'Nunca se ha cambiado.'}
      </p>
      {change.isError && !confirming && (
        <p role="alert" className="mt-3 text-sm font-bold text-err">
          {getErrorMessage(
            change.error,
            'No fue posible cambiar el acceso. Inténtalo nuevamente.',
          )}
        </p>
      )}
      <Dialog
        open={confirming}
        onOpenChange={(open) => {
          if (change.isPending) return;
          setConfirming(open);
          if (!open) change.reset();
        }}
      >
        <DialogContent showCloseButton={!change.isPending}>
          <DialogHeader>
            <DialogTitle>¿Permitir el acceso de la asociación?</DialogTitle>
            <DialogDescription>
              El Administrador podrá ver, crear y modificar las cuentas de tus
              empleados y tus roles propios. Puedes apagarlo cuando quieras.
            </DialogDescription>
          </DialogHeader>
          {change.isError && (
            <p className="text-sm font-bold text-err" role="alert">
              {getErrorMessage(
                change.error,
                'No fue posible cambiar el acceso. Inténtalo nuevamente.',
              )}
            </p>
          )}
          <DialogFooter>
            <DialogClose
              disabled={change.isPending}
              render={<Button variant="outline" />}
            >
              Cancelar
            </DialogClose>
            <Button disabled={change.isPending} onClick={() => send(true)}>
              {change.isPending ? 'Guardando…' : 'Permitir acceso'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
