'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useId, useState } from 'react';

import { buttonVariants } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session';
import { AccountStatusBadge } from '@/components/account-status-badge';
import { AccountStatusDialog } from '@/components/account-status-dialog';
import { ActivationDelivery } from '@/components/activation-delivery';
import { useRoleOptions } from '@/lib/api/role-options';
import { queryKeys } from '@/lib/api/query-keys';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import type { Producer } from '../api';
import { ProducerAccountCreateDialog } from './producer-account-create-dialog';

const noop = () => undefined;

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
          {account.activation_pending && (
            <ActivationDelivery
              key={account.id}
              id={account.id}
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
      <p className="text-sm text-muted-foreground">
        Acceso de la asociación:{' '}
        {producer.association_access ? 'encendido' : 'apagado'}
      </p>
      {producer.association_access &&
        hasPermission(user, PERMISSIONS.USERS_VIEW) && (
          <Link
            className={buttonVariants({ variant: 'outline', size: 'office' })}
            href={`/usuarios?productor=${producer.id}`}
          >
            Ver cuentas de este productor
          </Link>
        )}
    </section>
  );
}
