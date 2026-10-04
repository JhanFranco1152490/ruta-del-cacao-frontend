// Ruta fija con los ids como parámetros, como las de parcelas: una sola página guardada abre sin
// conexión para cualquier parcela, incluidas las creadas sin conexión.
export const characterizationPath = (plotId: string, farmId: string) =>
  `/fincas/parcelas/caracterizacion?${new URLSearchParams({ id: plotId, finca: farmId })}`;
