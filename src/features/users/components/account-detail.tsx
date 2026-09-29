'use client';
import { useState } from 'react';
import { Pencil, ShieldCheck } from 'lucide-react';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { components } from '@/lib/api/schema';
import { useMunicipalityName } from '@/lib/api/municipalities';
import { useAccount, type Account } from '../api';
import { hasFixedRole, isProducerAccount } from '../schemas';
import { AccountEditForm } from './account-edit-form';
import { AccountRolesPanel } from './account-roles-panel';
import { AccountStatusBadge } from '@/components/account-status-badge';
import { AccountStatusDialog } from '@/components/account-status-dialog';
import { ActivationDelivery } from '@/components/activation-delivery';

type SessionUser = components['schemas']['SessionUser'];
type Mode = 'view' | 'edit' | 'roles';

export function AccountDetail({
  id,
  user,
  receipt,
  onBusy,
}: {
  id: string;
  user: SessionUser;
  receipt?: { id: string; sent: boolean };
  onBusy: (value: boolean) => void;
}) {
  const account = useAccount(id);
  const [mode, setMode] = useState<Mode>('view');
  if (account.isPending) return <p role="status">Cargando cuenta…</p>;
  if (account.isError)
    return (
      <ErrorState
        message="Cuenta no disponible"
        onRetry={() => {
          void account.refetch();
        }}
      />
    );
  const data = account.data;
  const back = () => setMode('view');
  if (mode === 'edit')
    return <AccountEditForm account={data} onDone={back} onBusy={onBusy} />;
  if (mode === 'roles')
    return (
      <AccountRolesPanel
        account={data}
        user={user}
        onDone={back}
        onBusy={onBusy}
      />
    );
  // Nadie modifica su propia cuenta (`self_modification`), y desde el espacio del productor
  // nadie alcanza a la cuenta Productor: solo la asociación puede administrarla.
  const reachable =
    data.id !== user.id && !(isProducerAccount(data) && user.producer_id);
  const canUpdate = reachable && hasPermission(user, PERMISSIONS.USERS_UPDATE);
  const canChangeStatus =
    reachable && hasPermission(user, PERMISSIONS.USERS_CHANGE_STATUS);
  const canChangeRoles =
    canUpdate &&
    !hasFixedRole(data) &&
    hasPermission(user, PERMISSIONS.ROLES_VIEW);
  return (
    <div className="space-y-4">
      <AccountSummary account={data} />
      {(canUpdate || canChangeStatus) && (
        <div className="flex flex-wrap gap-3">
          {canUpdate && (
            <Button
              className="h-11"
              variant="outline"
              onClick={() => setMode('edit')}
            >
              <Pencil aria-hidden="true" className="size-4" /> Editar datos
            </Button>
          )}
          {canChangeRoles && (
            <Button
              className="h-11"
              variant="outline"
              onClick={() => setMode('roles')}
            >
              <ShieldCheck aria-hidden="true" className="size-4" /> Cambiar
              roles
            </Button>
          )}
          {canChangeStatus && (
            <AccountStatusDialog account={data} onBusy={onBusy} />
          )}
        </div>
      )}
      {data.activation_pending && (
        <ActivationDelivery
          key={id}
          id={id}
          sent={receipt?.id === id ? receipt.sent : undefined}
          canResend={canUpdate}
          onBusy={onBusy}
        />
      )}
    </div>
  );
}

function AccountSummary({ account }: { account: Account }) {
  const municipalityName = useMunicipalityName(Boolean(account.producer));
  return (
    <>
      <h2 className="font-serif text-2xl break-words text-selva">
        {account.first_name} {account.last_name}
      </h2>
      <AccountStatusBadge account={account} />
      <dl className="space-y-3">
        <div>
          <dt className="font-bold">Correo</dt>
          <dd className="break-all">{account.email}</dd>
        </div>
        <div>
          <dt className="font-bold">Documento</dt>
          <dd>
            {account.document_type} {account.identity_document}
          </dd>
        </div>
        <div>
          <dt className="font-bold">Teléfono</dt>
          <dd>{account.phone || 'No registrado'}</dd>
        </div>
        {account.producer && (
          <div>
            <dt className="font-bold">Productor</dt>
            <dd>{account.producer.member_code}</dd>
          </div>
        )}
        {account.producer && (
          <div>
            <dt className="font-bold">Municipio</dt>
            <dd>{municipalityName(account.producer.municipality_code)}</dd>
          </div>
        )}
        <div>
          <dt className="font-bold">Roles asignados</dt>
          <dd>
            {account.roles.map((role) => role.name).join(', ') || 'Sin roles'}
          </dd>
        </div>
      </dl>
      {account.producer?.status === 'inactive' && (
        <p>El acceso está bloqueado porque el productor está inactivo.</p>
      )}
    </>
  );
}
