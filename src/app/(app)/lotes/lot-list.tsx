'use client';

import { HARVESTS_PATH } from '@/features/harvests/harvest-paths';
import { LotListScreen } from '@/features/lots/components/lot-list-screen';

// Un lote se conforma desde su cosecha: «Conformar lote» lleva a las cosechas sin lote.
export function LotList() {
  return <LotListScreen formLotHref={`${HARVESTS_PATH}?lote=sin`} />;
}
