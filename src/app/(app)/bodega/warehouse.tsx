'use client';

import { lotDetailPath } from '@/features/lots/lot-paths';
import { WarehouseScreen } from '@/features/warehouse/components/warehouse-screen';

// Cada lote se abre en su ficha.
export function Warehouse() {
  return <WarehouseScreen lotHref={lotDetailPath} />;
}
