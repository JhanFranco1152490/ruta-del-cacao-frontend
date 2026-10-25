'use client';

import { DryingScreen } from '@/features/drying/components/drying-screen';
import { FACILITIES_PATH } from '@/features/facilities/facility-paths';
import { lotDetailPath } from '@/features/lots/lot-paths';

const facilitiesOfFarm = (farmId: string) =>
  `${FACILITIES_PATH}?${new URLSearchParams({ finca: farmId })}`;

// Cada lote se abre en su ficha; sin marquesinas libres al iniciar, se ofrece la infraestructura de
// su finca.
export function Drying() {
  return (
    <DryingScreen facilitiesHref={facilitiesOfFarm} lotHref={lotDetailPath} />
  );
}
