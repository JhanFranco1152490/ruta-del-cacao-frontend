'use client';
import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { BackLink } from '@/components/back-link';
import { Button } from '@/components/ui/button';
import { AssociationAccessCard } from '@/features/association-access/components/association-access-card';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { components } from '@/lib/api/schema';
import { useAccountFilters } from '../use-account-filters';
import { useAccountPanel } from '../use-account-panel';
import type { AccountCreated } from '../api';
import { AccountFilters } from './account-filters';
import { AccountList } from './account-list';
import { AccountPanel } from './account-panel';

export function AccountWorkspace({
  user,
}: {
  user: components['schemas']['SessionUser'];
}) {
  const filters = useAccountFilters(!user.producer_id);
  const panel = useAccountPanel();
  const [receipt, setReceipt] = useState<{ id: string; sent: boolean }>();
  function onCreated(account: AccountCreated) {
    setReceipt({ id: account.id, sent: account.activation_email_sent });
    void panel.open(account.id);
  }
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">
      <BackLink href="/panel">Volver al panel</BackLink>
      <PageHeader
        eyebrow="Administración"
        title="Usuarios y accesos"
        description="Consulta las cuentas y asigna los roles de tu equipo."
        actions={
          hasPermission(user, PERMISSIONS.USERS_CREATE) ? (
            <Button
              size="office"
              onClick={() => {
                void panel.open('nueva');
              }}
            >
              {!user.producer_id && !filters.producer
                ? 'Crear cuenta de administrador'
                : 'Crear cuenta de empleado'}
            </Button>
          ) : undefined
        }
      />
      {hasPermission(user, PERMISSIONS.ASSOCIATION_ACCESS_MANAGE) && (
        <div className="mt-8">
          <AssociationAccessCard />
        </div>
      )}
      <section className="mt-8 space-y-5 rounded-lg bg-card p-5 shadow-card">
        <AccountFilters
          filters={filters}
          canReadRoles={hasPermission(user, PERMISSIONS.ROLES_VIEW)}
        />
        {!user.producer_id && !filters.producer && (
          <p className="text-sm text-muted-foreground">
            Para crear empleados, entra desde el expediente de un productor que
            haya autorizado el acceso de la asociación.
          </p>
        )}
        <AccountList filters={filters} open={panel.open} />
      </section>
      {panel.selected !== null && (
        <AccountPanel
          key={`${panel.selected}:${filters.producer ?? ''}`}
          selected={panel.selected}
          user={user}
          producer={filters.producer}
          close={panel.close}
          onCreated={onCreated}
          receipt={receipt}
        />
      )}
    </div>
  );
}
