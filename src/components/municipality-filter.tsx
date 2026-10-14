'use client';

import { SearchSelect } from '@/components/search-select';
import type { Municipality } from '@/lib/api/municipalities';

// El municipio por el que se filtra una lista: «Todos los municipios» es la entrada fija y los
// 40 del departamento se pueden escribir para acotarlos. Un municipio que viene puesto desde la
// dirección y no está en el catálogo (todavía cargando, o fuera del departamento) se muestra con un
// texto que lo dice, en lugar de dejar el campo vacío.
export function MunicipalityFilter({
  value,
  municipalities,
  onChange,
  label = 'Filtrar por municipio',
  hideLabel = false,
  inputClassName,
  className,
}: {
  value: string | null | undefined;
  municipalities: readonly Municipality[];
  onChange: (code: string | null) => void;
  label?: string;
  hideLabel?: boolean;
  inputClassName?: string;
  className?: string;
}) {
  const options = municipalities.map(({ code, name }) => ({
    id: code,
    label: name,
  }));
  const selected = value
    ? (options.find(({ id }) => id === value) ?? {
        id: value,
        label: 'Municipio seleccionado',
      })
    : null;
  return (
    <SearchSelect
      allLabel="Todos los municipios"
      className={className}
      hideLabel={hideLabel}
      inputClassName={inputClassName}
      label={label}
      onChange={(option) => onChange(option?.id ?? null)}
      options={options}
      value={selected}
    />
  );
}
