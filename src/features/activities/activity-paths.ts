export const ACTIVITIES_PATH = '/actividades';

// La lista de actividades, abierta en un mes (yyyy-MM) si se indica.
export const activitiesPath = (month?: string) =>
  month
    ? `${ACTIVITIES_PATH}?${new URLSearchParams({ mes: month })}`
    : ACTIVITIES_PATH;
