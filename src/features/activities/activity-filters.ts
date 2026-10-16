import {
  type ActivityDay,
  type ActivityOfDay,
  effectiveState,
} from './activity-days';
import type { ActivityState } from './activity-state';
import type { AgriculturalActivity, Assignee } from './api';
import { farmLabel, plotLabel } from '@/lib/format/place-label';

export type ActivityFilters = {
  // Finca, parcela y responsable son el id de lo elegido; vacío es "todos".
  farm: string | null;
  plot: string | null;
  state: ActivityState | null;
  assignee: string | null;
};

export const NO_ACTIVITY_FILTERS: ActivityFilters = {
  farm: null,
  plot: null,
  state: null,
  assignee: null,
};

export const hasActivityFilters = ({
  farm,
  plot,
  state,
  assignee,
}: ActivityFilters) =>
  farm !== null || plot !== null || state !== null || assignee !== null;

// Los filtros se combinan: queda lo que cumple todos los que están puestos. Corren en el
// dispositivo sobre el estado de hoy, así que funcionan igual sin conexión.
export const applyActivityFilters = (
  items: readonly ActivityOfDay[],
  { farm, plot, state, assignee }: ActivityFilters,
): ActivityOfDay[] =>
  items.filter(
    (item) =>
      (farm === null || item.activity.plot.farm.id === farm) &&
      (plot === null || item.activity.plot.id === plot) &&
      (assignee === null || item.activity.assignee.id === assignee) &&
      (state === null || effectiveState(item) === state),
  );

// Lo mismo, día por día; los días que se quedan sin actividades dejan de salir.
export const applyFiltersToDays = (
  days: readonly ActivityDay[],
  filters: ActivityFilters,
): ActivityDay[] =>
  days
    .map((day) => ({
      ...day,
      activities: applyActivityFilters(day.activities, filters),
    }))
    .filter((day) => day.activities.length > 0);

export type FarmOption = { id: string; code: string; name: string };

// Las fincas que aparecen en las actividades, por nombre.
export function farmOptionsOf(
  activities: readonly AgriculturalActivity[],
): FarmOption[] {
  const farms = new Map<string, FarmOption>();
  for (const { plot } of activities) {
    farms.set(plot.farm.id, {
      id: plot.farm.id,
      code: plot.farm.code,
      name: plot.farm.name,
    });
  }
  return [...farms.values()].toSorted((a, b) => a.name.localeCompare(b.name));
}

export type PlotOption = { id: string; code: string; isActive: boolean };
export type FarmPlotOptions = {
  farmId: string;
  farmName: string;
  plots: PlotOption[];
};

// Las parcelas que aparecen en las actividades, agrupadas por finca, activas e inactivas: una
// parcela desactivada puede seguir teniendo labores. Las fincas van por nombre y las parcelas por
// código.
export function plotOptionsOf(
  activities: readonly AgriculturalActivity[],
): FarmPlotOptions[] {
  const farms = new Map<string, FarmPlotOptions>();
  for (const { plot } of activities) {
    const farm = farms.get(plot.farm.id) ?? {
      farmId: plot.farm.id,
      farmName: farmLabel(plot.farm),
      plots: [],
    };
    if (!farm.plots.some(({ id }) => id === plot.id)) {
      farm.plots.push({
        id: plot.id,
        code: plotLabel(plot),
        isActive: plot.is_active,
      });
    }
    farms.set(plot.farm.id, farm);
  }
  return [...farms.values()]
    .map((farm) => ({
      ...farm,
      plots: farm.plots.toSorted((a, b) =>
        a.code.localeCompare(b.code, 'es', { numeric: true }),
      ),
    }))
    .toSorted((a, b) => a.farmName.localeCompare(b.farmName));
}

// Las cuentas del productor para elegir un responsable, por nombre. Las inactivas se marcan: sus
// labores siguen en el calendario.
export const assigneeOptionsOf = (assignees: readonly Assignee[]) =>
  assignees
    .map(({ id, full_name, is_active }) => ({
      id,
      label: is_active ? full_name : `${full_name} (cuenta inactiva)`,
    }))
    .toSorted((a, b) => a.label.localeCompare(b.label));
