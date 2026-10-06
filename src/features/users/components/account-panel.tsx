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
import { isUuid } from '@/lib/validation/is-uuid';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { components } from '@/lib/api/schema';
import type { AccountCreated } from '../api';
import { AccountCreatePanel } from './account-create-panel';
import { AccountTypeStep } from './account-type-step';
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
  const association = !user.producer_id;
  // La cuenta técnica elige primero el tipo de cuenta (y el productor, si es de un empleado); el
  // Administrador solo crea cuentas de administrador, y la cuenta de un productor siempre es de un
  // empleado suyo.
  const [chosen, setChosen] = useState<{ producer?: string } | null>(
    association && user.is_superuser ? null : {},
  );
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
              ? !chosen
                ? 'Crear cuenta'
                : association && !chosen.producer
                  ? 'Crear cuenta de administrador'
                  : 'Crear cuenta de empleado'
              : 'Detalle de la cuenta'}
          </SheetTitle>
          <SheetDescription>
            Consulta y administra los datos, roles y estado de la cuenta.
          </SheetDescription>
        </SheetHeader>
        {selected === 'nueva' ? (
          hasPermission(user, PERMISSIONS.USERS_CREATE) ? (
            !chosen ? (
              <AccountTypeStep
                user={user}
                initialProducer={producer}
                onChoose={(picked) => setChosen({ producer: picked })}
              />
            ) : (
              <AccountCreatePanel
                user={user}
                producer={chosen.producer}
                onCreated={onCreated}
                onBusy={onBusy}
                close={close}
              />
            )
          ) : (
            <ErrorState message="No tienes permiso para crear cuentas." />
          )
        ) : isUuid(selected) ? (
          <AccountDetail
            id={selected}
            user={user}
            receipt={receipt}
            onBusy={onBusy}
            onDeleted={close}
          />
        ) : (
          <ErrorState message="Cuenta no disponible" />
        )}
      </SheetContent>
    </Sheet>
  );
}
