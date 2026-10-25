'use client';

import { FACILITIES_PATH } from '@/features/facilities/facility-paths';
import { FermentationScreen } from '@/features/fermentation/components/fermentation-screen';
import { lotDetailPath } from '@/features/lots/lot-paths';

const facilitiesOfFarm = (farmId: string) =>
  `${FACILITIES_PATH}?${new URLSearchParams({ finca: farmId })}`;

// Cada lote se abre en su ficha; sin cajones libres al iniciar, se ofrece la infraestructura de su
// finca.
export function Fermentation() {
  return (
    <FermentationScreen
      facilitiesHref={facilitiesOfFarm}
      lotHref={lotDetailPath}
    />
  );
}
