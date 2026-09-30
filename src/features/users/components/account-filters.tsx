import type { ReactNode } from 'react';
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
  producerFilter,
}: {
  filters: ReturnType<typeof useAccountFilters>;
  canReadRoles: boolean;
  // Sin catálogo (el espacio de un productor) no se ofrece el filtro de municipio.
  municipalities?: Municipality[];
  // De qué productor mira la asociación: lo arma quien usa este componente (conoce el
  // productor elegido y sus datos), aquí solo se ubica junto a rol y municipio.
  producerFilter?: ReactNode;
}) {
  const roles = useRoleOptions(canReadRoles);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <TextField
          label="Buscar usuarios"
          placeholder="Nombre, correo o documento"
          value={filters.searchInput}
          onChange={(event) => filters.setSearchInput(event.target.value)}
          wrapperClassName="min-w-56 flex-[2_1_16rem]"
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
          wrapperClassName="min-w-40 flex-1"
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
          wrapperClassName="min-w-40 flex-1"
        >
          <option value="">Todas las cuentas</option>
          <option value="pendiente">Pendiente de activación</option>
          <option value="activada">Activada</option>
        </SelectField>
      </div>
      {(canReadRoles || municipalities || producerFilter) && (
        <div className="flex flex-wrap gap-4">
          {producerFilter}
          {canReadRoles && (
            <SelectField
              label="Filtrar por rol"
              value={filters.role ?? ''}
              disabled={roles.isPending || roles.isError}
              onChange={(event) => {
                void filters.setRole(event.target.value || null);
              }}
              wrapperClassName="min-w-40 flex-1"
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
              wrapperClassName="min-w-40 flex-1"
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
      )}
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
