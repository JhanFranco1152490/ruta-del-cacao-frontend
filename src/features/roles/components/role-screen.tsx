'use client';
import { cn } from 'cn';
import { PageHeader } from '@/components/page-header';
import { PermissionGate } from '@/components/permission-gate';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/text-field';
import { SelectField } from '@/components/select-field';
import { ProducerFilter } from '@/components/producer-filter';
import { ProducerScopeControl } from '@/components/producer-scope-control';
import { useProducerSummary } from '@/lib/api/producer-options';
import { useProducerScope } from '@/hooks/use-producer-scope';
import { useSession } from '@/hooks/use-session';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { useRoleFilters } from '../use-role-filters';
import { useRolePanel } from '../use-role-panel';
import type { Role } from '../api';
import { RolePanel } from './role-panel';
import { RoleList } from './role-list';

export function RoleScreen() {
  return (
    <PermissionGate anyOf={[PERMISSIONS.ROLES_VIEW]}>
      <RoleScreenContent />
    </PermissionGate>
  );
}
function RoleScreenContent() {
  const { data: user } = useSession();
  return (
    <RoleWorkspace
      association={!user?.producer_id}
      manage={hasPermission(user, PERMISSIONS.ROLES_MANAGE)}
      canPickProducer={hasPermission(user, PERMISSIONS.PRODUCERS_VIEW)}
    />
  );
}
function RoleWorkspace({
  association,
  manage,
  canPickProducer,
}: {
  association: boolean;
  manage: boolean;
  canPickProducer: boolean;
}) {
  const scope = useProducerScope();
  const { data: user } = useSession();
  // La cuenta técnica viendo "Todos" los agrupa por productor; con un productor activo y la vista
  // "Del productor activo", ve los suyos y los del sistema, sin filtro de productor.
  const grouped = user?.is_superuser === true && !scope.scopedProducer;
  const filters = useRoleFilters(association, {
    producer: scope.scopedProducer,
    grouped,
  });
  const panel = useRolePanel();
  const pickProducer = association && canPickProducer && !scope.scopedProducer;
  const selectedProducer = useProducerSummary(
    pickProducer ? filters.producer : undefined,
  );
  const canCreate = manage && (!association || !!filters.producer);
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">
      <PageHeader
        eyebrow="Administración"
        title="Roles y permisos"
        description="Consulta los roles del sistema y administra los permisos de los roles propios."
        actions={
          canCreate ? (
            <Button
              size="office"
              onClick={() => {
                void panel.open('nuevo');
              }}
            >
              Crear rol
            </Button>
          ) : undefined
        }
      />
      <section className="mt-8 space-y-5 rounded-lg bg-card p-5 shadow-card">
        {scope.offered && (
          <ProducerScopeControl
            value={scope.view}
            onChange={(view) => {
              void scope.setView(view);
              void filters.setPage(1);
            }}
          />
        )}
        <div
          className={cn(
            'grid gap-4',
            pickProducer ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
          )}
        >
          <TextField
            label="Buscar roles"
            value={filters.searchInput}
            onChange={(event) => filters.setSearchInput(event.target.value)}
            placeholder="Buscar por nombre"
          />
          <SelectField
            label="Filtrar por tipo"
            value={filters.kind ?? ''}
            onChange={(event) => {
              void filters.setKind(
                (event.target.value || null) as Role['kind'] | null,
              );
            }}
          >
            <option value="">Todos los tipos</option>
            <option value="fixed">Fijos</option>
            <option value="predefined">Predefinidos</option>
            <option value="custom">Propios</option>
          </SelectField>
          {pickProducer && (
            <ProducerFilter
              producer={filters.producer}
              selected={selectedProducer}
              onSelect={(id) => {
                void filters.setProducer(id);
              }}
              onClear={() => {
                void filters.clearProducer();
              }}
            />
          )}
        </div>
        {pickProducer && !filters.producer && (
          <p className="text-sm text-muted-foreground">
            Elige un productor para administrar sus roles propios.
          </p>
        )}
        {!pickProducer && association && manage && !filters.producer && (
          <p className="text-sm text-muted-foreground">
            Para crear un rol propio, entra desde el expediente del productor.
          </p>
        )}
        <RoleList
          filters={filters}
          open={panel.open}
          byProducer={association}
          grouped={
            grouped
              ? { activeProducerId: scope.acting ?? undefined }
              : undefined
          }
        />
      </section>
      {panel.selected !== null && (
        <RolePanel
          key={`${panel.selected}:${filters.producer ?? ''}`}
          selected={panel.selected}
          manage={manage}
          canCreate={canCreate}
          producer={filters.producer}
          close={panel.close}
          open={panel.open}
        />
      )}
    </div>
  );
}
