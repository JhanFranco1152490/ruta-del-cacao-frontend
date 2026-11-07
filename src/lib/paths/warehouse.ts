export const WAREHOUSE_PATH = '/bodega';

export const WAREHOUSE_VIEWS = [
  'existencias',
  'por-ingresar',
  'bodegas',
] as const;
export type WarehouseView = (typeof WAREHOUSE_VIEWS)[number];

export const WAREHOUSE_ACTIONS = ['ingresar', 'salida'] as const;
export type WarehouseAction = (typeof WAREHOUSE_ACTIONS)[number];

// La pestaña donde vive cada acción: el lote por ingresar todavía no tiene existencias.
const VIEW_OF_ACTION: Record<WarehouseAction, WarehouseView> = {
  ingresar: 'por-ingresar',
  salida: 'existencias',
};

// Abre Bodega con el formulario de un lote, en la pestaña que le corresponde: Lotes lleva aquí.
export const warehouseActionPath = (lotId: string, action: WarehouseAction) =>
  `${WAREHOUSE_PATH}?${new URLSearchParams({
    vista: VIEW_OF_ACTION[action],
    lote: lotId,
    accion: action,
  })}`;
