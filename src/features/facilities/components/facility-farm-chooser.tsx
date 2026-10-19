import { FOCUS_OUTLINE_CLASS } from '@/components/ui/focus-outline';
import type { FarmOption } from '@/lib/api/farm-options';
import { farmLabel } from '@/lib/format/place-label';

import type { PostharvestFacility } from '../api';
import { facilitiesOfFarm } from '../facility-filters';
import { farmContentsText } from '../facility-summary';

// Los cajones y las marquesinas se usan en la finca donde están, así que la lista es de una finca
// a la vez: aquí se elige. Mientras los elementos no han cargado, las tarjetas no dicen qué tiene
// cada finca.
export function FacilityFarmChooser({
  farms,
  facilities,
  onChoose,
}: {
  farms: readonly FarmOption[];
  facilities: readonly PostharvestFacility[] | undefined;
  onChoose: (farmId: string) => void;
}) {
  return (
    <section aria-labelledby="facility-farm-question" className="space-y-4">
      <h2 className="text-2xl text-selva" id="facility-farm-question">
        ¿De qué finca quieres ver los cajones y marquesinas?
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {farms.map((farm) => (
          <li key={farm.id}>
            <button
              className={`flex min-h-12 w-full cursor-pointer flex-col gap-1 rounded-(--radius) border bg-card p-4 text-left transition-colors hover:bg-surface-alt ${FOCUS_OUTLINE_CLASS}`}
              onClick={() => onChoose(farm.id)}
              type="button"
            >
              <span className="text-lg font-bold text-selva">
                {farmLabel(farm)}
              </span>
              <span className="text-sm text-muted-foreground">
                {farm.municipality}
              </span>
              {facilities && (
                <span className="text-sm font-bold">
                  {farmContentsText(facilitiesOfFarm(facilities, farm.id))}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
