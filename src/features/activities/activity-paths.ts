export const ACTIVITIES_PATH = '/actividades';

// La lista de actividades, abierta en un mes (yyyy-MM) si se indica.
export const activitiesPath = (month?: string) =>
  month
    ? `${ACTIVITIES_PATH}?${new URLSearchParams({ mes: month })}`
    : ACTIVITIES_PATH;

// La pantalla de campo donde se registra la realización. Ruta fija con el id como parámetro: una
// sola página guardada sirve para cualquier actividad, también sin conexión.
export const ACTIVITY_COMPLETION_PATH = `${ACTIVITIES_PATH}/realizar`;

export const activityCompletionPath = (activityId: string) =>
  `${ACTIVITY_COMPLETION_PATH}?${new URLSearchParams({ id: activityId })}`;
