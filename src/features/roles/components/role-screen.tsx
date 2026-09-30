'use client';
import { cn } from 'cn';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/text-field';
import { SelectField } from '@/components/select-field';
import { ProducerFilter } from '@/components/producer-filter';
import { useProducerSummary } from '@/lib/api/producer-options';
import { useSession } from '@/hooks/use-session';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { useRoleFilters } from '../use-role-filters';
import { useRolePanel } from '../use-role-panel';
import type { Role } from '../api';
import { RolePanel } from './role-panel';
import { RoleList } from './role-list';

export function RoleScreen() {
  const session = useSession();
  if (session.isPending) return <p role="status">Cargando sesión…</p>;
  if (!hasPermission(session.data, PERMISSIONS.ROLES_VIEW))
    return <ErrorState message="Acceso no disponible" />;
  return (
    <RoleWorkspace
      association={!session.data?.producer_id}
      manage={hasPermission(session.data, PERMISSIONS.ROLES_MANAGE)}
      canPickProducer={hasPermission(session.data, PERMISSIONS.PRODUCERS_VIEW)}
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
  const filters = useRoleFilters(association);
  const panel = useRolePanel();
  const pickProducer = association && canPickProducer;
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
              deniedMessage="Este productor no ha autorizado el acceso de la asociación: no puedes ver ni administrar sus roles propios."
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
