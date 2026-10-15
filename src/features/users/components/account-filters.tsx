import type { ReactNode } from 'react';
import { FilterRow } from '@/components/filter-row';
import { MunicipalityFilter } from '@/components/municipality-filter';
import { TextField } from '@/components/text-field';
import { SelectField } from '@/components/select-field';
import { Button } from '@/components/ui/button';
import { useRoleOptions } from '@/lib/api/role-options';
import type { Municipality } from '@/lib/api/municipalities';
import { WITHOUT_FARM, type useAccountFilters } from '../use-account-filters';

export function AccountFilters({
  filters,
  canReadRoles,
  municipalities,
  producerFilter,
  farms,
}: {
  filters: ReturnType<typeof useAccountFilters>;
  canReadRoles: boolean;
  // Sin catálogo (el espacio de un productor) no se ofrece el filtro de municipio.
  municipalities?: Municipality[];
  // De qué productor mira la asociación: lo arma quien usa este componente (conoce el
  // productor elegido y sus datos), aquí solo se ubica junto a rol y municipio.
  producerFilter?: ReactNode;
  // Las fincas del productor, para filtrar quién trabaja en cada una; solo en su espacio.
  farms?: { id: string; name: string }[];
}) {
  const roles = useRoleOptions(canReadRoles);
  const active =
    (filters.status ? 1 : 0) +
    (filters.activation ? 1 : 0) +
    (filters.role ? 1 : 0) +
    (filters.municipality ? 1 : 0) +
    (filters.producer ? 1 : 0) +
    (filters.farm ? 1 : 0);
  return (
    <div className="space-y-3">
      <FilterRow
        activeCount={active}
        more={
          (producerFilter || municipalities) && (
            <>
              {producerFilter}
              {municipalities && (
                <MunicipalityFilter
                  className="w-full sm:w-56"
                  hideLabel
                  label="Municipio"
                  municipalities={municipalities}
                  onChange={(code) => {
                    void filters.setMunicipality(code);
                  }}
                  value={filters.municipality}
                />
              )}
            </>
          )
        }
        moreActiveCount={
          (filters.municipality ? 1 : 0) + (filters.producer ? 1 : 0)
        }
        search={
          <TextField
            hideLabel
            label="Buscar usuarios"
            onChange={(event) => filters.setSearchInput(event.target.value)}
            placeholder="Nombre, correo o documento"
            type="search"
            value={filters.searchInput}
            wrapperClassName="min-w-0 flex-1 sm:min-w-64"
          />
        }
      >
        <SelectField
          hideLabel
          label="Estado"
          value={filters.status ?? ''}
          onChange={(event) => {
            void filters.setStatus(
              (event.target.value || undefined) as
                'active' | 'inactive' | undefined,
            );
          }}
          wrapperClassName="w-full sm:w-44"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activa</option>
          <option value="inactive">Inactiva</option>
        </SelectField>
        <SelectField
          hideLabel
          label="Activación"
          value={filters.activation ?? ''}
          onChange={(event) => {
            void filters.setActivation(
              (event.target.value || null) as 'pendiente' | 'activada' | null,
            );
          }}
          wrapperClassName="w-full sm:w-48"
        >
          <option value="">Todas las cuentas</option>
          <option value="pendiente">Pendiente de activación</option>
          <option value="activada">Activada</option>
        </SelectField>
        {canReadRoles && (
          <SelectField
            hideLabel
            label="Filtrar por rol"
            value={filters.role ?? ''}
            disabled={roles.isPending || roles.isError}
            onChange={(event) => {
              void filters.setRole(event.target.value || null);
            }}
            wrapperClassName="w-full sm:w-48"
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
        {farms && (
          <SelectField
            hideLabel
            label="Finca"
            value={filters.farm ?? ''}
            onChange={(event) => {
              void filters.setFarm(event.target.value || null);
            }}
            wrapperClassName="w-full sm:w-52"
          >
            <option value="">Todas las fincas</option>
            <option value={WITHOUT_FARM}>Sin alcance asignado</option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </SelectField>
        )}
      </FilterRow>
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
