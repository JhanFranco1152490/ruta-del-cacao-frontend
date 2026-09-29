import { TextField } from '@/components/text-field';
import { SelectField } from '@/components/select-field';
import { Button } from '@/components/ui/button';
import { useRoleOptions } from '@/lib/api/role-options';
import type { Municipality } from '@/lib/api/municipalities';
import type { useAccountFilters } from '../use-account-filters';

export function AccountFilters({
  filters,
  canReadRoles,
  municipalities,
}: {
  filters: ReturnType<typeof useAccountFilters>;
  canReadRoles: boolean;
  // Sin catálogo (el espacio de un productor) no se ofrece el filtro de municipio.
  municipalities?: Municipality[];
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
        {municipalities && (
          <SelectField
            label="Municipio"
            value={filters.municipality ?? ''}
            onChange={(event) => {
              void filters.setMunicipality(event.target.value || null);
            }}
          >
            <option value="">Todos los municipios</option>
            {filters.municipality &&
              !municipalities.some(
                (municipality) => municipality.code === filters.municipality,
              ) && (
                <option value={filters.municipality}>
                  Municipio seleccionado
                </option>
              )}
            {municipalities.map((municipality) => (
              <option key={municipality.code} value={municipality.code}>
                {municipality.name}
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
    </div>
  );
}
