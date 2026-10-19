import type { FacilityType } from '@/lib/facility-labels';
import { normalizeCatalogName } from '@/lib/format/search';

import type { PostharvestFacility } from './api';

// Cómo se pintan en la finca: C-01 en los cajones, M-01 en las marquesinas.
const PREFIXES: Record<FacilityType, string> = {
  fermentation_box: 'C',
  solar_dryer: 'M',
};

// El siguiente nombre libre de ese tipo en la finca: sigue al número más alto que ya hay (C-04
// después de C-03, aunque falte C-02, que alguien eliminó) y salta cualquiera que ya esté tomado,
// sin importar el tipo, porque el servidor compara los nombres de toda la finca. Es solo una
// propuesta: la persona la cambia si en la finca lo llaman distinto.
export function suggestFacilityName(
  known: readonly PostharvestFacility[],
  farmId: string,
  type: FacilityType,
) {
  const prefix = PREFIXES[type];
  const ofFarm = known.filter((facility) => facility.farm.id === farmId);
  const taken = new Set(
    ofFarm.map((facility) => normalizeCatalogName(facility.name)),
  );
  const own = new RegExp(`^${prefix}[\\s-]*(\\d+)$`, 'i');
  const highest = Math.max(
    0,
    ...ofFarm
      .filter((facility) => facility.facility_type === type)
      .map((facility) => Number(own.exec(facility.name.trim())?.[1] ?? 0)),
  );

  for (let number = highest + 1; ; number += 1) {
    const name = `${prefix}-${String(number).padStart(2, '0')}`;
    if (!taken.has(normalizeCatalogName(name))) return name;
  }
}
