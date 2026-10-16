export const PESTS_DISEASES_PATH = '/plagas-enfermedades';

// La sección de sanidad: se elige la parcela y se abre su historial.
export const HEALTH_PATH = '/sanidad';

// La planilla del monitoreo y el historial de una parcela son rutas fijas con el id como
// parámetro: una sola página guardada sirve para cualquiera, también sin conexión.
export const MONITORING_PATH = `${HEALTH_PATH}/monitoreo`;

export const monitoringPath = (activityId: string) =>
  `${MONITORING_PATH}?${new URLSearchParams({ id: activityId })}`;

export const PLOT_HISTORY_PATH = '/parcelas/historial-fitosanitario';

export const plotHistoryPath = (plotId: string) =>
  `${PLOT_HISTORY_PATH}?${new URLSearchParams({ id: plotId })}`;
