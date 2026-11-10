export const SALES_PATH = '/ventas';

// Registrar es una página propia, con sus líneas; con `finca` empieza en esa finca.
export const NEW_SALE_PATH = `${SALES_PATH}/registrar`;

export const newSalePath = (farmId?: string | null) =>
  farmId
    ? `${NEW_SALE_PATH}?${new URLSearchParams({ finca: farmId })}`
    : NEW_SALE_PATH;

// Ruta fija con parámetros: una sola página guardada abre cualquier venta sin conexión.
export const SALE_DETAIL_PATH = `${SALES_PATH}/detalle`;

export const saleDetailPath = (id: string) =>
  `${SALE_DETAIL_PATH}?${new URLSearchParams({ id })}`;
