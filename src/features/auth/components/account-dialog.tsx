'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useHasConnection } from '@/hooks/use-has-connection';
import type { SessionUser } from '@/hooks/use-session';

import { useRequestPasswordReset } from '../api';

// Los datos de la cuenta con la que se entró y el cambio de contraseña. Cambiarla usa el mismo
// enlace por correo que "¿Olvidaste tu contraseña?": no hace falta escribir la actual.
export function AccountDialog({
  user,
  open,
  onOpenChange,
}: {
  user: SessionUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const reset = useRequestPasswordReset();
  const hasConnection = useHasConnection();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mi cuenta</DialogTitle>
          <DialogDescription>
            {user.producer_id
              ? 'Cuenta de un productor'
              : 'Cuenta de la asociación'}
          </DialogDescription>
        </DialogHeader>
        <dl className="space-y-4">
          <div>
            <dt className="text-sm text-muted-foreground">Correo</dt>
            <dd className="font-bold break-all">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Roles</dt>
            <dd className="mt-1 flex flex-wrap gap-2">
              {user.roles.length ? (
                user.roles.map((role) => (
                  <span
                    key={role.id}
                    className="rounded-full bg-ok-bg px-3 py-1 text-sm font-bold text-ok"
                  >
                    {role.name}
                  </span>
                ))
              ) : (
                <span className="text-muted-foreground">
                  Sin roles asignados
                </span>
              )}
            </dd>
          </div>
        </dl>
        <section className="space-y-2 border-t border-border pt-4">
          <h3 className="font-bold text-selva">Contraseña</h3>
          {reset.isSuccess ? (
            <p role="status">
              Te enviamos un enlace a {user.email} para cambiar tu contraseña.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Te llegará un enlace al correo para elegir una contraseña nueva.
              </p>
              <Button
                variant="outline"
                disabled={!hasConnection || reset.isPending}
                onClick={() => reset.mutate(user.email)}
              >
                {reset.isPending ? 'Enviando…' : 'Cambiar contraseña'}
              </Button>
              {!hasConnection && (
                <p className="text-sm text-muted-foreground">
                  Necesitas conexión para cambiar la contraseña.
                </p>
              )}
              {reset.isError && (
                <p role="alert" className="text-sm font-bold text-err">
                  No fue posible enviar el enlace. Inténtalo nuevamente.
                </p>
              )}
            </>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
