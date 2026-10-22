'use client';
import { SidePanelEditBand } from '@/components/side-panel';
import { useState } from 'react';
import { Pencil, ShieldCheck } from 'lucide-react';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { components } from '@/lib/api/schema';
import { useAccount } from '../api';
import { hasFixedRole, isProducerAccount } from '../schemas';
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
  // La finca de un empleado la asigna quien alcanza todas: el Productor o la cuenta técnica.
  const farmsOf =
    user.all_farms && data.producer && !hasFixedRole(data)
      ? {
          userId: user.id,
          producer: user.producer_id ? undefined : data.producer.id,
        }
      : undefined;
  if (mode === 'edit')
    return (
      <div>
        <SidePanelEditBand
          kicker="Datos de la cuenta"
          title={`${data.first_name} ${data.last_name}`}
        />
        <div className="space-y-4 px-5 py-4">
          <AccountEditForm
            account={data}
            farmsOf={farmsOf}
            onDone={back}
            onBusy={onBusy}
          />
        </div>
      </div>
    );
  if (mode === 'roles')
    return (
      <div>
        <SidePanelEditBand
          kicker="Roles de la cuenta"
          title={`${data.first_name} ${data.last_name}`}
        />
        <div className="space-y-4 px-5 py-4">
          <AccountRolesPanel
            account={data}
            user={user}
            farmsOf={farmsOf}
            onDone={back}
            onBusy={onBusy}
          />
        </div>
      </div>
    );
  // Nadie modifica su propia cuenta (`self_modification`), y desde el espacio del productor
  // nadie alcanza a la cuenta Productor: solo la asociación puede administrarla.
  const reachable =
    data.id !== user.id && !(isProducerAccount(data) && user.producer_id);
  const canUpdate = reachable && hasPermission(user, PERMISSIONS.USERS_UPDATE);
  const canChangeStatus =
    reachable && hasPermission(user, PERMISSIONS.USERS_CHANGE_STATUS);
  const canDelete =
    reachable &&
    !data.has_signed_in &&
    hasPermission(user, PERMISSIONS.USERS_DELETE);
  const canChangeRoles =
    canUpdate &&
    !hasFixedRole(data) &&
    hasPermission(user, PERMISSIONS.ROLES_VIEW);
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
