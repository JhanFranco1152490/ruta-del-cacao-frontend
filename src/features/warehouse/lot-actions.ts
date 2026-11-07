import { Boxes, PackagePlus } from 'lucide-react';

import type { LotAction } from '@/lib/lot-actions';
import type { LotStatus } from '@/lib/lot-status';
import { WAREHOUSE_PATH, warehouseActionPath } from '@/lib/paths/warehouse';

import type { WarehousePermissions } from './warehouse-actions';

// El botón de la cabecera de Lotes cuando se mira un estado: Clasificado lleva a los lotes por
// ingresar (para quien puede ingresarlos) y En bodega, a las existencias.
export function warehouseStageAction(
  status: LotStatus,
  can: WarehousePermissions,
): LotAction | null {
  if (status === 'classified' && can.entry) {
    return {
      id: 'go-to-warehouse',
      label: 'Ir a Bodega',
      href: `${WAREHOUSE_PATH}?${new URLSearchParams({ vista: 'por-ingresar' })}`,
      icon: Boxes,
    };
  }
  if (status === 'in_warehouse' && can.view) {
    return {
      id: 'go-to-warehouse',
      label: 'Ir a Bodega',
      href: WAREHOUSE_PATH,
      icon: Boxes,
    };
  }
  return null;
}

// Lo que ofrece bodega en el menú de un lote de Lotes: ingresar el Clasificado, que abre su
// formulario en Bodega.
export function warehouseLotActions(
  lot: { id: string; status: LotStatus },
  can: WarehousePermissions,
): LotAction[] {
  if (lot.status !== 'classified' || !can.entry) return [];
  return [
    {
      id: 'store-lot',
      label: 'Ingresar a bodega',
      href: warehouseActionPath(lot.id, 'ingresar'),
      icon: PackagePlus,
    },
  ];
}
