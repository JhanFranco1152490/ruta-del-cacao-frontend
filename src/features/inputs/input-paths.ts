export const INPUTS_PATH = '/insumos';

// Ruta fija con los ids como parámetros: una sola página guardada sirve para cualquier insumo.
export const inputMovementsPath = (inputId: string, farmId: string) =>
  `/insumos/movimientos?${new URLSearchParams({ id: inputId, finca: farmId })}`;
