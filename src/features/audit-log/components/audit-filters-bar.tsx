'use client';

import { chosenOption } from '@/components/chosen-option';
import { DateRangeFilter } from '@/components/date-range-filter';
import { FilterRow } from '@/components/filter-row';
import { SearchSelect } from '@/components/search-select';
import { SelectField } from '@/components/select-field';
import { Button } from '@/components/ui/button';

import { isAuditRecordType } from '../audit-record-types';
import type { AuditLogScreenState } from '../use-audit-log-screen';

// El usuario (a la vista también en celular), el tipo de registro y el periodo, en el orden de las
// demás listas, con «Limpiar filtros» al final.
export function AuditFiltersBar({ screen }: { screen: AuditLogScreenState }) {
  const { filters } = screen;
  const { values } = filters;
  const activeCount = [values.recordType, values.from || values.to].filter(
    Boolean,
  ).length;

  return (
    <FilterRow
      activeCount={activeCount}
      compact
      search={
        <SearchSelect
          allLabel="Todos los usuarios"
          className="w-full sm:w-56"
          compact
          label="Usuario"
          onChange={(option) => void filters.setActor(option?.id ?? null)}
          options={screen.actorOptions}
          placeholder="Buscar usuario"
          value={chosenOption(
            values.actor,
            screen.actorOptions,
            'Usuario elegido',
          )}
        />
      }
      trailing={
        filters.hasFilters && (
          <Button
            className="h-10"
            onClick={() => void filters.clear()}
            size="office"
            type="button"
            variant="ghost"
          >
            Limpiar filtros
          </Button>
        )
      }
    >
      <SelectField
        className="h-10 text-sm"
        hideLabel
        label="Tipo de registro"
        onChange={(event) => {
          const value = event.target.value;
          void filters.setRecordType(isAuditRecordType(value) ? value : null);
        }}
        value={values.recordType ?? ''}
        wrapperClassName="w-full sm:w-52"
      >
        <option value="">Todos los registros</option>
        {screen.recordTypes.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </SelectField>
      <DateRangeFilter
        error={screen.periodError}
        from={values.from}
        onFrom={(date) => void filters.setFrom(date)}
        onTo={(date) => void filters.setTo(date)}
        to={values.to}
      />
    </FilterRow>
  );
}
