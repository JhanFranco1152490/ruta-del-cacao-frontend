'use client';
import { PageHeader } from '@/components/page-header';
import { PermissionGate } from '@/components/permission-gate';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/text-field';
import { SelectField } from '@/components/select-field';
import { FilterRow } from '@/components/filter-row';
import { ProducerFilter } from '@/components/producer-filter';
import { useProducerSummary } from '@/lib/api/producer-options';
import { useSession } from '@/hooks/use-session';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { useRoleFilters } from '../use-role-filters';
import { useRolePanel } from '../use-role-panel';
import type { Role } from '../api';
import { RolePanel } from './role-panel';
import { RoleList } from './role-list';
import { pageContainerClass } from '@/components/page-container';

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
      superuser={user?.is_superuser === true}
      manage={hasPermission(user, PERMISSIONS.ROLES_MANAGE)}
      canPickProducer={hasPermission(user, PERMISSIONS.PRODUCERS_VIEW)}
    />
  );
}
function RoleWorkspace({
  association,
  superuser,
  manage,
  canPickProducer,
}: {
  association: boolean;
  superuser: boolean;
  manage: boolean;
  canPickProducer: boolean;
}) {
  const filters = useRoleFilters(superuser);
  const panel = useRolePanel();
  const pickProducer = superuser && canPickProducer;
  const selectedProducer = useProducerSummary(
    pickProducer ? filters.producer : undefined,
  );
  // Solo la cuenta técnica crea roles de un productor y elige cuál; el Administrador de la
  // asociación solo consulta los roles del sistema.
  const canCreate =
    manage && (!association || pickProducer || !!filters.producer);
  return (
    <div className={pageContainerClass('wide')}>
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
        <FilterRow
          activeCount={(filters.kind ? 1 : 0) + (filters.producer ? 1 : 0)}
          search={
            <TextField
              hideLabel
              label="Buscar roles"
              value={filters.searchInput}
              onChange={(event) => filters.setSearchInput(event.target.value)}
              placeholder="Buscar por nombre"
              type="search"
              wrapperClassName="min-w-0 flex-1 sm:min-w-64"
            />
          }
        >
          <SelectField
            hideLabel
            label="Filtrar por tipo"
            value={filters.kind ?? ''}
            onChange={(event) => {
              void filters.setKind(
                (event.target.value || null) as Role['kind'] | null,
              );
            }}
            wrapperClassName="w-full sm:w-48"
          >
            <option value="">Todos los tipos</option>
            <option value="fixed">Fijos</option>
            <option value="predefined">Predefinidos</option>
            <option value="custom">Propios</option>
          </SelectField>
          {pickProducer && (
            <ProducerFilter
              className="w-full sm:w-72"
              hideLabel
              placeholder="Productor: nombre, documento o código"
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
        </FilterRow>
        <RoleList filters={filters} open={panel.open} byProducer={superuser} />
      </section>
      {panel.selected !== null && (
        <RolePanel
          key={`${panel.selected}:${filters.producer ?? ''}`}
          selected={panel.selected}
          manage={manage}
          canCreate={canCreate}
          askProducer={superuser}
          producer={filters.producer}
          close={panel.close}
          open={panel.open}
        />
      )}
    </div>
  );
}
