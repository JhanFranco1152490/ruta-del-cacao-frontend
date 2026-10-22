'use client';

import type { onlyFarmOf } from '@/lib/farm-scope';

import { farmOptionsOf, plotOptionsOf } from '../activity-filters';
import type { AgriculturalActivity, Assignee } from '../api';
import { calendarAssigneeOptions } from '../calendar-filtering';
import type { useActivityFilters } from '../use-activity-filters';
import { ActivityFiltersBar } from './activity-filters-bar';
import { ActivityFiltersToggle } from './activity-filters-toggle';

// Los filtros del calendario: en una fila en escritorio y plegados tras un botón en celular. Las
// opciones salen de las actividades que se ven y, los responsables, también de las cuentas del
// productor.
export function ActivityCalendarFilters({
  filterState,
  superuser,
  onlyFarm,
  producer,
  activities,
  assignees,
  filtersSet,
  barFiltersSet,
  isDesktop,
}: {
  filterState: ReturnType<typeof useActivityFilters>;
  // La cuenta técnica elige además el productor.
  superuser: boolean;
  // Quien trabaja en una sola finca no la elige.
  onlyFarm: ReturnType<typeof onlyFarmOf>;
  producer: string | null;
  activities: readonly AgriculturalActivity[];
  assignees: readonly Assignee[] | undefined;
  filtersSet: boolean;
  barFiltersSet: number;
  isDesktop: boolean;
}) {
  const bar = (
    <ActivityFiltersBar
      assignedToMe={filterState.assignedToMe}
      assigneeOptions={calendarAssigneeOptions(assignees, activities)}
      farmOptions={farmOptionsOf(activities)}
      filters={filterState.filters}
      hasFilters={filtersSet}
      onAssignee={filterState.setAssignee}
      onClear={filterState.clear}
      onFarm={filterState.setFarm}
      onPlot={filterState.setPlot}
      onProducer={superuser ? filterState.setProducer : undefined}
      onToggleAssignedToMe={filterState.toggleAssignedToMe}
      onlyFarm={onlyFarm}
      plotOptions={plotOptionsOf(activities)}
      producer={producer}
    />
  );
  if (isDesktop) return bar;
  return (
    <ActivityFiltersToggle activeCount={barFiltersSet}>
      {bar}
    </ActivityFiltersToggle>
  );
}
