import type { ActivityOfDay } from './activity-days';
import {
  type ActivityFilters,
  applyActivityFilters,
  assigneeOptionsOf,
  hasActivityFilters,
} from './activity-filters';
import { summarizeActivities } from './activity-summary';
import type { ActivityView } from './activity-view';
import type { AgriculturalActivity, Assignee } from './api';

// Lo que el calendario muestra con los filtros puestos.
export function filterCalendar(
  items: readonly ActivityOfDay[],
  filters: ActivityFilters,
  view: ActivityView,
) {
  // Pendientes no tiene recuentos de estado desde donde filtrarlo: un estado que quedó en la
  // dirección no debe filtrar a escondidas lo que se ve.
  const active = view === 'pendientes' ? { ...filters, state: null } : filters;
  return {
    filtered: applyActivityFilters(items, active),
    filtersSet: hasActivityFilters(active),
    // Los recuentos respetan los demás filtros pero no el de estado, para que los números no
    // cambien al tocarlos.
    summary: summarizeActivities(
      applyActivityFilters(items, { ...filters, state: null }),
    ),
    // Cuántos filtros de la barra hay puestos; el estado se ve y se filtra desde los recuentos.
    barFiltersSet: [filters.farm, filters.plot, filters.assignee].filter(
      Boolean,
    ).length,
  };
}

// Los responsables que se pueden elegir: las cuentas del productor y quienes aparecen en las
// actividades que se ven (la cuenta técnica sin productor elegido no tiene otra lista), sin repetir.
export function calendarAssigneeOptions(
  listed: readonly Assignee[] | undefined,
  activities: readonly AgriculturalActivity[],
) {
  const byId = new Map(
    [...(listed ?? []), ...activities.map(({ assignee }) => assignee)].map(
      (assignee) => [assignee.id, assignee],
    ),
  );
  return assigneeOptionsOf([...byId.values()]);
}
