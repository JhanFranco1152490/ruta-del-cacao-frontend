'use client';

import { lotDetailPath } from '@/features/lots/lot-paths';
import { QualityScreen } from '@/features/quality/components/quality-screen';

// Cada lote se abre en su ficha.
export function Quality() {
  return <QualityScreen lotHref={lotDetailPath} />;
}
