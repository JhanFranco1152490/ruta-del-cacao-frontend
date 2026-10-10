'use client';

import { SelectField } from '@/components/select-field';

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
  return (
    <SelectField
      hint="Las existencias se llevan por finca. Con «Todas las fincas» ves el total."
      label="Finca"
      onChange={(event) => onChange(event.target.value || null)}
      value={farm ?? ''}
      wrapperClassName="sm:max-w-sm"
    >
      <option value="">Todas las fincas</option>
      {farms.map((choice) => (
        <option key={choice.id} value={choice.id}>
          {choice.is_active ? choice.name : `${choice.name} (inactiva)`}
        </option>
      ))}
    </SelectField>
  );
}
