// La sección de actividades: a ella vuelven las capturas de campo (la realización, el resultado de
// un monitoreo) cuando no se abrieron desde otra pantalla.
export const ACTIVITIES_PATH = '/actividades';

// Programar un monitoreo desde otra pantalla (Sanidad): el calendario abre su formulario con el
// tipo elegido y, si se indican, la finca y la parcela. El valor va en español como el resto de la
// dirección.
export const SCHEDULE_PARAM = 'programar';
export const SCHEDULE_MONITORING = 'monitoreo';

export function scheduleMonitoringPath({
  farm,
  plot,
}: { farm?: string | null; plot?: string | null } = {}) {
  const params = new URLSearchParams({
    [SCHEDULE_PARAM]: SCHEDULE_MONITORING,
  });
  if (farm) params.set('finca', farm);
  if (plot) params.set('parcela', plot);
  return `${ACTIVITIES_PATH}?${params}`;
}

// El calendario en su vista de pendientes: todo lo que sigue sin registrar, por viejo que sea.
export const PENDING_ACTIVITIES_PATH = `${ACTIVITIES_PATH}?vista=pendientes`;
