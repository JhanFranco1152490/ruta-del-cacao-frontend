import { ErrorState } from '@/components/error-state';
import { useAccount } from '../api';
import { AccountStatusBadge } from './account-status-badge';
import { ActivationDelivery } from './activation-delivery';

export function AccountDetail({
  id,
  receipt,
  canResend,
  onBusy,
}: {
  id: string;
  receipt?: { id: string; sent: boolean };
  canResend: boolean;
  onBusy: (value: boolean) => void;
}) {
  const account = useAccount(id);
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
  return (
    <div className="space-y-4">
      <h2 className="font-serif text-2xl break-words text-selva">
        {data.first_name} {data.last_name}
      </h2>
      <AccountStatusBadge account={data} />
      <dl className="space-y-3">
        <div>
          <dt className="font-bold">Correo</dt>
          <dd className="break-all">{data.email}</dd>
        </div>
        <div>
          <dt className="font-bold">Documento</dt>
          <dd>
            {data.document_type} {data.identity_document}
          </dd>
        </div>
        <div>
          <dt className="font-bold">Teléfono</dt>
          <dd>{data.phone || 'No registrado'}</dd>
        </div>
        <div>
          <dt className="font-bold">Productor</dt>
          <dd>{data.producer?.member_code || 'Cuenta de la asociación'}</dd>
        </div>
        <div>
          <dt className="font-bold">Roles asignados</dt>
          <dd>
            {data.roles.map((role) => role.name).join(', ') || 'Sin roles'}
          </dd>
        </div>
      </dl>
      {data.producer?.status === 'inactive' && (
        <p>El acceso está bloqueado porque el productor está inactivo.</p>
      )}
      {data.activation_pending && receipt?.id === id && (
        <ActivationDelivery
          key={id}
          id={id}
          sent={receipt.sent}
          canResend={canResend}
          onBusy={onBusy}
        />
      )}
    </div>
  );
}
