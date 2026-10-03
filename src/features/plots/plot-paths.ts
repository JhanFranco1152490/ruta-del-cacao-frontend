// Rutas fijas con los ids como parámetros: una sola página guardada que abre sin conexión para
// cualquier finca o parcela, incluidas las creadas sin conexión. La finca va siempre en la
// dirección porque sus datos (área, ubicación) hacen falta antes de leer la parcela.
export const plotNewPath = (farmId: string) =>
  `/fincas/parcelas/nueva?${new URLSearchParams({ finca: farmId })}`;

export const plotEditPath = (plotId: string, farmId: string) =>
  `/fincas/parcelas/editar?${new URLSearchParams({ id: plotId, finca: farmId })}`;
