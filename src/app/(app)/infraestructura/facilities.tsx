'use client';

import { FacilitiesScreen } from '@/features/facilities/components/facilities-screen';
import { lotDetailPath } from '@/features/lots/lot-paths';

// El lote que ocupa un cajón o una marquesina se abre en su ficha.
export function Facilities() {
  return <FacilitiesScreen lotHref={lotDetailPath} />;
}
