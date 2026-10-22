'use client';
import { SidePanelEditBand } from '@/components/side-panel';
import { type ReactNode, useState } from 'react';
import { Pencil, ShieldCheck } from 'lucide-react';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import type { components } from '@/lib/api/schema';
import { useAccount } from '../api';
import { accountActions, farmAssignerFor } from '../account-actions';
import { isProducerAccount } from '../schemas';
import { AccountEditForm } from './account-edit-form';
import { AccountBand, AccountSections } from './account-summary';
import { AccountRolesPanel } from './account-roles-panel';
import { AccountDeleteDialog } from '@/components/account-delete-dialog';
import { AccountStatusDialog } from '@/components/account-status-dialog';
import {
  ACTIVATION_NEEDS_ACTIVE_PRODUCER,
  ActivationDelivery,
  CHANGE_RECORD_EMAIL_HINT,
} from '@/components/activation-delivery';

type SessionUser = components['schemas']['SessionUser'];
type Mode = 'view' | 'edit' | 'roles';

export function AccountDetail({
  id,
  user,
  receipt,
  onBusy,
  onDeleted,
}: {
  id: string;
  user: SessionUser;
  receipt?: { id: string; sent: boolean };
  onBusy: (value: boolean) => void;
  onDeleted: () => void;
}) {
  const account = useAccount(id);
  const [mode, setMode] = useState<Mode>('view');
  // El detalle trae su propia franja hasta los bordes; lo demás va con relleno.
  if (account.isPending)
    return (
      <p className="px-5 py-4" role="status">
        Cargando cuenta…
      </p>
    );
  if (account.isError)
    return (
      <div className="px-5 py-4">
        <ErrorState
          message="Cuenta no disponible"
          onRetry={() => {
            void account.refetch();
          }}
        />
      </div>
    );
  const data = account.data;
  const back = () => setMode('view');
  const farmsOf = farmAssignerFor(data, user);
  const fullName = `${data.first_name} ${data.last_name}`;
  if (mode === 'edit')
    return (
      <EditPanel kicker="Datos de la cuenta" title={fullName}>
        <AccountEditForm
          account={data}
          farmsOf={farmsOf}
          onDone={back}
          onBusy={onBusy}
        />
      </EditPanel>
    );
  if (mode === 'roles')
    return (
      <EditPanel kicker="Roles de la cuenta" title={fullName}>
        <AccountRolesPanel
          account={data}
          user={user}
          farmsOf={farmsOf}
          onDone={back}
          onBusy={onBusy}
        />
      </EditPanel>
    );
  const { canUpdate, canChangeStatus, canDelete, canChangeRoles } =
    accountActions(data, user);
  return (
    <div>
      <AccountBand account={data} />
      <div className="space-y-4 px-5 py-4">
        <AccountSections account={data} />
        {(canUpdate || canChangeStatus || canDelete) && (
          <div className="flex flex-wrap gap-3">
            {canUpdate && (
              <Button
                variant="action"
                size="office"
                onClick={() => setMode('edit')}
              >
                <Pencil aria-hidden="true" className="size-4" /> Editar datos
              </Button>
            )}
            {canChangeRoles && (
              <Button
                variant="action"
                size="office"
                onClick={() => setMode('roles')}
              >
                <ShieldCheck aria-hidden="true" className="size-4" /> Cambiar
                roles
              </Button>
            )}
            {canChangeStatus && (
              <AccountStatusDialog
                account={data}
                onBusy={onBusy}
                reactivatesProducer={
                  isProducerAccount(data) &&
                  data.producer?.status === 'inactive'
                }
              />
            )}
            {canDelete && (
              <AccountDeleteDialog account={data} onDeleted={onDeleted} />
            )}
          </div>
        )}
        {data.activation_pending && data.producer?.status === 'inactive' && (
          <p className="text-sm text-muted-foreground">
            {ACTIVATION_NEEDS_ACTIVE_PRODUCER}
          </p>
        )}
        {data.activation_pending && data.producer?.status !== 'inactive' && (
          <ActivationDelivery
            key={id}
            id={id}
            email={data.email}
            sent={receipt?.id === id ? receipt.sent : undefined}
            canResend={canUpdate}
            // El correo de la cuenta Productor es el de su expediente: se cambia ahí, no aquí.
            canChangeEmail={canUpdate && !isProducerAccount(data)}
            changeEmailHint={CHANGE_RECORD_EMAIL_HINT}
            onBusy={onBusy}
          />
        )}
      </div>
    </div>
  );
}

// Editar ocupa el panel: la franja dice qué se edita y de quién.
function EditPanel({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <SidePanelEditBand kicker={kicker} title={title} />
      <div className="space-y-4 px-5 py-4">{children}</div>
    </div>
  );
}
