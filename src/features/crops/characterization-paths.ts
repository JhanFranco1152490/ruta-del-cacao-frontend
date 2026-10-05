// Ruta fija con los ids como parámetros, como las de parcelas: una sola página guardada abre sin
// conexión para cualquier parcela, incluidas las creadas sin conexión.
export const characterizationPath = (plotId: string, farmId: string) =>
  `/fincas/parcelas/caracterizacion?${new URLSearchParams({ id: plotId, finca: farmId })}`;

// El historial de la ficha de una parcela: solo con conexión.
export const characterizationHistoryPath = (plotId: string, farmId: string) =>
  `/fincas/parcelas/caracterizacion/historial?${new URLSearchParams({ id: plotId, finca: farmId })}`;
