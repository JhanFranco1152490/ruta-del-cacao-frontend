'use client';
import { useRef, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ErrorState } from '@/components/error-state';
import { isUuid } from '@/lib/is-uuid';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { components } from '@/lib/api/schema';
import type { AccountCreated } from '../api';
import { AccountCreatePanel } from './account-create-panel';
import { AccountDetail } from './account-detail';

export function AccountPanel({
  selected,
  user,
  producer,
  close,
  onCreated,
  receipt,
}: {
  selected: string;
  user: components['schemas']['SessionUser'];
  producer?: string;
  close: () => void;
  onCreated: (account: AccountCreated) => void;
  receipt?: { id: string; sent: boolean };
}) {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  function onBusy(value: boolean) {
    lock.current = value;
    setBusy(value);
  }
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !lock.current) close();
      }}
    >
      <SheetContent side="right" showCloseButton={!busy}>
        <SheetHeader>
          <SheetTitle>
            {selected === 'nueva'
              ? !user.producer_id && !producer
                ? 'Crear cuenta de administrador'
                : 'Crear cuenta de empleado'
              : 'Detalle de la cuenta'}
          </SheetTitle>
          <SheetDescription>
            Consulta los datos, roles y estado de activación de la cuenta.
          </SheetDescription>
        </SheetHeader>
        {selected === 'nueva' ? (
          hasPermission(user, PERMISSIONS.USERS_CREATE) ? (
            <AccountCreatePanel
              user={user}
              producer={producer}
              onCreated={onCreated}
              onBusy={onBusy}
              close={close}
            />
          ) : (
            <ErrorState message="No tienes permiso para crear cuentas." />
          )
        ) : isUuid(selected) ? (
          <AccountDetail
            id={selected}
            receipt={receipt}
            canResend={
              hasPermission(user, PERMISSIONS.USERS_UPDATE) &&
              selected !== user.id
            }
            onBusy={onBusy}
          />
        ) : (
          <ErrorState message="Cuenta no disponible" />
        )}
      </SheetContent>
    </Sheet>
  );
}
