'use client';
import { BackLink } from '@/components/back-link';
import { PageHeader } from '@/components/page-header';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/text-field';
import { SelectField } from '@/components/select-field';
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
    />
  );
}
function RoleWorkspace({
  association,
  manage,
}: {
  association: boolean;
  manage: boolean;
}) {
  const filters = useRoleFilters(association);
  const panel = useRolePanel();
  const canCreate = manage && (!association || !!filters.producer);
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">
      <BackLink href="/panel">Volver al panel</BackLink>
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
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
        {filters.producer && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm break-all">
              Productor seleccionado: {filters.producer}
            </span>
            <Button
              variant="outline"
              onClick={() => {
                void filters.clearProducer();
              }}
            >
              Quitar filtro de productor
            </Button>
          </div>
        )}
        {association && manage && !filters.producer && (
          <p className="text-sm text-muted-foreground">
            Para crear un rol propio, entra desde el expediente del productor.
          </p>
        )}
        <RoleList filters={filters} open={panel.open} />
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
