import { TextField } from '@/components/text-field';
import { SelectField } from '@/components/select-field';
import { Button } from '@/components/ui/button';
import { useRoleOptions } from '@/lib/api/role-options';
import type { useAccountFilters } from '../use-account-filters';

export function AccountFilters({
  filters,
  canReadRoles,
}: {
  filters: ReturnType<typeof useAccountFilters>;
  canReadRoles: boolean;
}) {
  const roles = useRoleOptions(canReadRoles);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Buscar usuarios"
          placeholder="Nombre, correo o documento"
          value={filters.searchInput}
          onChange={(event) => filters.setSearchInput(event.target.value)}
        />
        <SelectField
          label="Estado"
          value={filters.status ?? ''}
          onChange={(event) => {
            void filters.setStatus(
              (event.target.value || undefined) as
                'active' | 'inactive' | undefined,
            );
          }}
        >
          <option value="">Todos los estados</option>
          <option value="active">Activa</option>
          <option value="inactive">Inactiva</option>
        </SelectField>
        <SelectField
          label="Activación"
          value={filters.activation ?? ''}
          onChange={(event) => {
            void filters.setActivation(
              (event.target.value || null) as 'pendiente' | 'activada' | null,
            );
          }}
        >
          <option value="">Todas las cuentas</option>
          <option value="pendiente">Pendiente de activación</option>
          <option value="activada">Activada</option>
        </SelectField>
        {canReadRoles && (
          <SelectField
            label="Filtrar por rol"
            value={filters.role ?? ''}
            disabled={roles.isPending || roles.isError}
            onChange={(event) => {
              void filters.setRole(event.target.value || null);
            }}
          >
            <option value="">Todos los roles</option>
            {filters.role &&
              !roles.data?.some((role) => role.id === filters.role) && (
                <option value={filters.role}>Rol seleccionado</option>
              )}
            {roles.data?.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </SelectField>
        )}
      </div>
      {canReadRoles && roles.isError && (
        <div role="alert">
          <p>No fue posible cargar el filtro de roles.</p>
          <Button
            variant="outline"
            onClick={() => {
              void roles.refetch();
            }}
          >
            Reintentar roles
          </Button>
        </div>
      )}
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
    </div>
  );
}
