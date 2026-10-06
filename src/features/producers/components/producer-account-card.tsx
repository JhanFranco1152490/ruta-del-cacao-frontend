'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';

import { useSession } from '@/hooks/use-session';
import { AccountDeleteDialog } from '@/components/account-delete-dialog';
import { AccountStatusBadge } from '@/components/account-status-badge';
import { AccountStatusDialog } from '@/components/account-status-dialog';
import {
  ActivationDelivery,
  CHANGE_RECORD_EMAIL_HINT,
} from '@/components/activation-delivery';
import { useAccount } from '@/lib/api/accounts';
import { useRoleOptions } from '@/lib/api/role-options';
import { queryKeys } from '@/lib/api/query-keys';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import type { Producer } from '../api';
import { ProducerAccountCreateDialog } from './producer-account-create-dialog';

const noop = () => undefined;

// El resumen de la cuenta del expediente no dice si ya inició sesión: se pide su detalle, y solo
// quien puede consultarla y eliminarla.
function DeleteAccountAction({
  accountId,
  onDeleted,
}: {
  accountId: string;
  onDeleted: () => void;
}) {
  const account = useAccount(accountId);
  if (!account.data || account.data.has_signed_in) return null;
  return <AccountDeleteDialog account={account.data} onDeleted={onDeleted} />;
}

// Bloque "Cuenta de acceso" del expediente. Cada acción vuelve a pedir el expediente, que es
// el que trae el resumen de la cuenta.
export function ProducerAccountCard({ producer }: { producer: Producer }) {
  const titleId = useId();
  const client = useQueryClient();
  const session = useSession();
  const user = session.data;
  const canCreate =
    producer.status === 'active' &&
    hasPermission(user, PERMISSIONS.USERS_CREATE) &&
    hasPermission(user, PERMISSIONS.ROLES_VIEW);
  const roles = useRoleOptions(!producer.account && canCreate);
  const producerRole = roles.data?.find((role) => role.code === 'producer');
  const [receipt, setReceipt] = useState<{ id: string; sent: boolean }>();
  const refresh = () =>
    void client.invalidateQueries({
      queryKey: queryKeys.producers.detail(producer.id),
    });
  const account = producer.account;
  return (
    <section
      aria-labelledby={titleId}
      className="space-y-4 rounded-[var(--radius-card)] bg-card p-5 shadow-card"
    >
      <h2 id={titleId} className="text-2xl text-selva">
        Cuenta de acceso
      </h2>
      {account ? (
        <>
          <p className="break-all">{account.email}</p>
          <AccountStatusBadge
            account={{
              ...account,
              producer: {
                id: producer.id,
                member_code: producer.member_code,
                first_name: producer.first_name,
                last_name: producer.last_name,
                status: producer.status,
                municipality_code: producer.municipality_code,
              },
            }}
          />
          {hasPermission(user, PERMISSIONS.USERS_CHANGE_STATUS) &&
            user?.id !== account.id && (
              <AccountStatusDialog
                account={account}
                onBusy={noop}
                onChanged={refresh}
              />
            )}
          {hasPermission(user, PERMISSIONS.USERS_DELETE) &&
            hasPermission(user, PERMISSIONS.USERS_VIEW) &&
            user?.id !== account.id && (
              <DeleteAccountAction accountId={account.id} onDeleted={refresh} />
            )}
          {account.activation_pending && (
            <ActivationDelivery
              key={account.id}
              id={account.id}
              email={account.email}
              changeEmailHint={CHANGE_RECORD_EMAIL_HINT}
              sent={receipt?.id === account.id ? receipt.sent : undefined}
              canResend={hasPermission(user, PERMISSIONS.USERS_UPDATE)}
              onBusy={noop}
            />
          )}
        </>
      ) : producer.status === 'active' ? (
        <>
          <p>Este productor aún no tiene cuenta de acceso.</p>
          {canCreate && producerRole && (
            <ProducerAccountCreateDialog
              producerId={producer.id}
              producerRoleId={producerRole.id}
              email={producer.email}
              onCreated={(created) => {
                setReceipt({
                  id: created.id,
                  sent: created.activation_email_sent,
                });
                refresh();
              }}
            />
          )}
        </>
      ) : (
        <p>Reactiva el productor para crear su cuenta.</p>
      )}
    </section>
  );
}
