'use client';

import { SearchSelect } from '@/components/search-select';

export type FarmChoice = { id: string; name: string; is_active: boolean };

// De qué bodega se ven las existencias, como un filtro más de la fila (sin etiqueta visible: «Todas
// las fincas» ya dice qué es). Sin una finca elegida se ve el total de todas. Quien trabaja en una
// sola la tiene fija (`fixed`): no tiene un total que ver. Lo que significa elegir una finca lo
// dice `farmSelectNote`, bajo la tabla.
export function InputFarmSelect({
  farms,
  farm,
  onChange,
  fixed = false,
}: {
  farms: readonly FarmChoice[];
  farm: string | null;
  onChange: (farm: string | null) => void;
  fixed?: boolean;
}) {
  const options = farms.map((choice) => ({
    id: choice.id,
    label: choice.is_active ? choice.name : `${choice.name} (inactiva)`,
  }));
  return (
    <SearchSelect
      allLabel={fixed ? undefined : 'Todas las fincas'}
      className="w-full sm:w-64"
      disabled={fixed}
      hideLabel
      label="Finca"
      onChange={(option) => onChange(option?.id ?? null)}
      options={options}
      value={options.find((option) => option.id === farm) ?? null}
    />
  );
}

export const farmSelectNote = (fixed: boolean) =>
  fixed
    ? 'Las existencias son las de la finca en la que trabajas.'
    : 'Las existencias se llevan por finca. Con «Todas las fincas» ves el total.';
