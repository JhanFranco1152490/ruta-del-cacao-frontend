'use client';

import { useEffect } from 'react';

import { SelectField } from '@/components/select-field';

export type FarmChoice = { id: string; name: string; is_active: boolean };

// De qué bodega se ven las existencias. Con una sola finca activa no hay nada que elegir y se
// elige sola; con varias, la elegida queda en la URL.
export function InputFarmSelect({
  farms,
  farm,
  onChange,
}: {
  farms: readonly FarmChoice[];
  farm: string | null;
  onChange: (farm: string | null) => void;
}) {
  const active = farms.filter((choice) => choice.is_active);
  const onlyActive = active.length === 1 ? active[0].id : null;
  useEffect(() => {
    if (!farm && onlyActive) onChange(onlyActive);
  }, [farm, onlyActive, onChange]);

  return (
    <SelectField
      hint="Las existencias se llevan por finca."
      label="Finca"
      onChange={(event) => onChange(event.target.value || null)}
      value={farm ?? ''}
      wrapperClassName="sm:max-w-sm"
    >
      <option value="">Elige una finca</option>
      {farms.map((choice) => (
        <option key={choice.id} value={choice.id}>
          {choice.is_active ? choice.name : `${choice.name} (inactiva)`}
        </option>
      ))}
    </SelectField>
  );
}
