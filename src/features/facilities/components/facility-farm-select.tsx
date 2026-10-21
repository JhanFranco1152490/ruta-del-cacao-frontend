'use client';

import { SearchSelect } from '@/components/search-select';
import type { FarmOption } from '@/lib/api/farm-options';
import { farmLabel } from '@/lib/format/place-label';

import type { PostharvestFacility } from '../api';
import { facilitiesOfFarm } from '../facility-filters';
import { farmContentsText } from '../facility-summary';

// De qué finca se ven los cajones y las marquesinas. Se usan en la finca donde están, así que la
// lista es de una finca a la vez; cambiar de finca se hace aquí, sin salir de la pantalla. Cada
// opción dice qué tiene la finca (mientras los elementos no han cargado, no dice nada).
export function FacilityFarmSelect({
  farms,
  farm,
  facilities,
  onChange,
}: {
  farms: readonly FarmOption[];
  farm: FarmOption;
  facilities: readonly PostharvestFacility[] | undefined;
  onChange: (farmId: string) => void;
}) {
  const options = farms.map((choice) => ({
    id: choice.id,
    label: farmLabel(choice),
    description: facilities
      ? farmContentsText(facilitiesOfFarm(facilities, choice.id))
      : undefined,
  }));
  return (
    <SearchSelect
      className="sm:max-w-sm"
      clearable={false}
      label="Finca"
      onChange={(option) => option && onChange(option.id)}
      options={options}
      value={options.find((option) => option.id === farm.id) ?? null}
    />
  );
}
