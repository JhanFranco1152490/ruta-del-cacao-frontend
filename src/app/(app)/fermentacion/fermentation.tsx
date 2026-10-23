'use client';

import { FermentationScreen } from '@/features/fermentation/components/fermentation-screen';
import { lotDetailPath } from '@/features/lots/lot-paths';

// Cada lote en fermentación se abre en su ficha.
export function Fermentation() {
  return <FermentationScreen lotHref={lotDetailPath} />;
}
