'use client';
import { useId, useState } from 'react';
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
import { getErrorMessage, isApiError } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/format/dates';
import { useAssociationAccess, useSetAssociationAccess } from '../api';

// Interruptor con el que el productor deja (o no) que la asociación gestione sus cuentas y
// roles. El estado mostrado es siempre el del servidor: si el cambio falla, no se mueve.
export function AssociationAccessCard() {
  const access = useAssociationAccess();
  const change = useSetAssociationAccess();
  const [confirming, setConfirming] = useState(false);
  // El sentido del cambio que se está confirmando. Se guarda aparte de `confirming` para que
  // el diálogo no cambie de texto mientras se cierra.
  const [target, setTarget] = useState(true);
  const labelId = useId();
  const helpId = useId();
  if (access.isPending)
    return <p role="status">Cargando acceso de la asociación…</p>;
  if (access.isError)
    return (
      // Tarjeta compacta, no el ErrorState de página completa: esto es un widget más de una
      // pantalla con lista, no todo el contenido reemplazado por un error.
      <div role="alert" className="rounded-lg bg-card p-5 shadow-card">
        <p className="font-bold text-err">
          {getErrorMessage(
            access.error,
            'No fue posible consultar el acceso de la asociación.',
          )}
        </p>
        {/* Un 404 (la cuenta no tiene productor) no cambia al reintentar. */}
        {!(isApiError(access.error) && access.error.status === 404) && (
          <Button
            className="mt-3 h-10"
            variant="outline"
            onClick={() => {
              void access.refetch();
            }}
          >
            Reintentar
          </Button>
        )}
      </div>
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
            // Los dos sentidos piden confirmación: encender le da al Administrador la gestión
            // de las cuentas y apagar se la quita.
            onCheckedChange={(next) => {
              change.reset();
              setTarget(next);
              setConfirming(true);
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
            <DialogTitle>
              {target
                ? '¿Permitir el acceso de la asociación?'
                : '¿Quitar el acceso de la asociación?'}
            </DialogTitle>
            <DialogDescription>
              {target
                ? 'El Administrador podrá ver, crear y modificar las cuentas de tus empleados y tus roles propios. Puedes apagarlo cuando quieras.'
                : 'El Administrador dejará de ver y gestionar las cuentas de tus empleados y tus roles propios. Puedes volver a encenderlo cuando quieras.'}
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
            <Button disabled={change.isPending} onClick={() => send(target)}>
              {change.isPending
                ? 'Guardando…'
                : target
                  ? 'Permitir acceso'
                  : 'Quitar acceso'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
