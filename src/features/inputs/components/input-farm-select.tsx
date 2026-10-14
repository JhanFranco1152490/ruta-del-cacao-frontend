'use client';

import { SearchSelect } from '@/components/search-select';

export type FarmChoice = { id: string; name: string; is_active: boolean };

// De qué bodega se ven las existencias. Sin una finca elegida se ve el total de todas.
export function InputFarmSelect({
  farms,
  farm,
  onChange,
}: {
  farms: readonly FarmChoice[];
  farm: string | null;
  onChange: (farm: string | null) => void;
}) {
  const options = farms.map((choice) => ({
    id: choice.id,
    label: choice.is_active ? choice.name : `${choice.name} (inactiva)`,
  }));
  return (
    <SearchSelect
      allLabel="Todas las fincas"
      className="sm:max-w-sm"
      hint="Las existencias se llevan por finca. Con «Todas las fincas» ves el total."
      label="Finca"
      onChange={(option) => onChange(option?.id ?? null)}
      options={options}
      value={options.find((option) => option.id === farm) ?? null}
    />
  );
}
