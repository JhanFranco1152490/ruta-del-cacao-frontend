'use client';
import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { useProducerSummary } from '@/lib/api/producer-options';
import {
  useMunicipalities,
  useMunicipalityName,
} from '@/lib/api/municipalities';
import type { components } from '@/lib/api/schema';
import { useAccountFilters } from '../use-account-filters';
import { useAccountPanel } from '../use-account-panel';
import type { AccountCreated } from '../api';
import { AccountFilters } from './account-filters';
import { AccountList } from './account-list';
import { AccountPanel } from './account-panel';
import { ProducerFilter } from '@/components/producer-filter';

export function AccountWorkspace({
  user,
}: {
  user: components['schemas']['SessionUser'];
}) {
  const association = !user.producer_id;
  const superuser = user.is_superuser;
  const filters = useAccountFilters(association, superuser);
  const municipalities = useMunicipalities(association);
  const municipalityName = useMunicipalityName(association);
  const canPickProducer =
    association && hasPermission(user, PERMISSIONS.PRODUCERS_VIEW);
  const selectedProducer = useProducerSummary(
    canPickProducer ? filters.producer : undefined,
  );
  const panel = useAccountPanel();
  const [receipt, setReceipt] = useState<{ id: string; sent: boolean }>();
  function onCreated(account: AccountCreated) {
    setReceipt({ id: account.id, sent: account.activation_email_sent });
    void panel.open(account.id);
  }
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">
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
              {association ? 'Crear cuenta' : 'Crear cuenta de empleado'}
            </Button>
          ) : undefined
        }
      />
      <section className="mt-8 space-y-5 rounded-lg bg-card p-5 shadow-card">
        <AccountFilters
          filters={filters}
          canReadRoles={hasPermission(user, PERMISSIONS.ROLES_VIEW)}
          municipalities={association ? (municipalities.data ?? []) : undefined}
          producerFilter={
            canPickProducer && (
              <ProducerFilter
                producer={filters.producer}
                selected={selectedProducer}
                onSelect={(id) => {
                  void filters.setProducer(id);
                }}
                onClear={() => {
                  void filters.clearProducer();
                }}
                className="min-w-56 flex-1"
              />
            )
          }
        />
        <AccountList
          filters={filters}
          open={panel.open}
          municipalityName={association ? municipalityName : undefined}
          showProducer={association}
          canGroup={superuser}
        />
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
