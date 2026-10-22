'use client';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { useRef, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  SIDE_PANEL_CLASS,
  SidePanelBody,
  SidePanelHeader,
} from '@/components/side-panel';
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
  const isDesktop = useIsDesktop();
  const [busy, setBusy] = useState(false);
  const association = !user.producer_id;
  // La cuenta técnica elige primero el tipo de cuenta (y el productor, si es de un empleado); el
  // Administrador solo crea cuentas de administrador, y la cuenta de un productor siempre es de un
  // empleado suyo.
  const [chosen, setChosen] = useState<{ producer?: string } | null>(
    association && user.is_superuser ? null : {},
  );
  const lock = useRef(false);
  const existing = selected !== 'nueva' && isUuid(selected);
  function onBusy(value: boolean) {
    lock.current = value;
    setBusy(value);
  }
  return (
    <Sheet
      closeOnBack={false}
      open
      onOpenChange={(open) => {
        if (!open && !lock.current) close();
      }}
    >
      {/* Una cuenta que ya existe trae su franja de color hasta los bordes y su propio relleno; una
          nueva usa la franja común de las hojas laterales. */}
      <SheetContent
        className={SIDE_PANEL_CLASS}
        side={isDesktop ? 'right' : 'bottom'}
        showCloseButton={!busy}
      >
        <SidePanelHeader
          band={!existing}
          description={
            existing
              ? 'Consulta y administra los datos, roles y estado de la cuenta.'
              : !chosen
                ? 'Elige qué tipo de cuenta vas a crear.'
                : association && !chosen.producer
                  ? 'Una cuenta con acceso de administración de la asociación.'
                  : 'Los datos de acceso, los roles y las fincas de la persona.'
          }
          title={
            selected === 'nueva'
              ? !chosen
                ? 'Crear cuenta'
                : association && !chosen.producer
                  ? 'Crear cuenta de administrador'
                  : 'Crear cuenta de empleado'
              : 'Detalle de la cuenta'
          }
        />
        {selected === 'nueva' ? (
          hasPermission(user, PERMISSIONS.USERS_CREATE) ? (
            <SidePanelBody>
              {!chosen ? (
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
              )}
            </SidePanelBody>
          ) : (
            <SidePanelBody>
              <ErrorState message="No tienes permiso para crear cuentas." />
            </SidePanelBody>
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
          <SidePanelBody>
            <ErrorState message="Cuenta no disponible" />
          </SidePanelBody>
        )}
      </SheetContent>
    </Sheet>
  );
}
