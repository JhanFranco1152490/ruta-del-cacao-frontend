'use client';

import { SearchSelect } from '@/components/search-select';

export type FarmChoice = { id: string; name: string; is_active: boolean };

// De qué bodega se ven las existencias. Sin una finca elegida se ve el total de todas. Quien
// trabaja en una sola la tiene fija (`fixed`): no tiene un total que ver.
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
      className="sm:max-w-sm"
      disabled={fixed}
      hint={
        fixed
          ? 'Las existencias de la finca en la que trabajas.'
          : 'Las existencias se llevan por finca. Con «Todas las fincas» ves el total.'
      }
      label="Finca"
      onChange={(option) => onChange(option?.id ?? null)}
      options={options}
      value={options.find((option) => option.id === farm) ?? null}
    />
  );
}
