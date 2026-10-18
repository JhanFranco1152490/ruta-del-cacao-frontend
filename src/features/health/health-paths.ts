export const PESTS_DISEASES_PATH = '/plagas-enfermedades';

// La sección de sanidad: el historial de los monitoreos, con filtros por finca, parcela, plaga y
// periodo.
export const HEALTH_PATH = '/sanidad';

// La planilla del monitoreo es una ruta fija con el id como parámetro: una sola página guardada
// sirve para cualquiera, también sin conexión.
export const MONITORING_PATH = `${HEALTH_PATH}/monitoreo`;

export const monitoringPath = (activityId: string) =>
  `${MONITORING_PATH}?${new URLSearchParams({ id: activityId })}`;

// El historial fitosanitario es la pantalla de Sanidad con sus filtros en la dirección: desde la
// tarjeta de una parcela se abre ya filtrado por ella.
export const healthHistoryPath = ({
  farm,
  plot,
}: {
  farm?: string | null;
  plot?: string | null;
}) => {
  const params = new URLSearchParams();
  if (farm) params.set('finca', farm);
  if (plot) params.set('parcela', plot);
  return params.size ? `${HEALTH_PATH}?${params}` : HEALTH_PATH;
};

export const plotHistoryPath = (plotId: string) =>
  healthHistoryPath({ plot: plotId });
