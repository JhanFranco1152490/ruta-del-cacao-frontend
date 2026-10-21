'use client';

import { useState } from 'react';

import { PageHeader } from '@/components/page-header';
import { pageContainerClass } from '@/components/page-container';
import { SegmentedControl } from '@/components/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/hooks/use-session';

import { historyQuery } from '../history-filters';
import { pestFilterOptions } from '../history-summary';
import { useHistoryChoices } from '../use-history-choices';
import { type HealthView, useHistoryFilters } from '../use-history-filters';
import { usePendingItems } from '../use-pending-items';
import { HistoryFiltersBar } from './history-filters-bar';
import { HistoryTab } from './history-tab';
import { PendingTab } from './pending-tab';
import { ScheduleMonitoringLink } from './schedule-monitoring-link';

// Sanidad: dos pestañas. Pendiente es lo que hay por hacer (monitoreos por registrar, controles
// por atender y los monitoreos que vienen); Historial, lo ya registrado, con filtros de finca,
// parcela, plaga y periodo en la dirección. Sin pestaña en la dirección abre en Pendiente si hay
// algo que le toque a quien mira, y en Historial si no; esa decisión se toma una vez, para que
// resolver lo último pendiente no cambie la pantalla de golpe.
export function HealthScreen() {
  const { data: user } = useSession();
  const filterState = useHistoryFilters();
  // El productor solo lo elige la cuenta técnica: las demás ya ven lo suyo.
  const superuser = user?.is_superuser === true;
  const filters = {
    ...filterState.filters,
    producer: superuser ? filterState.filters.producer : null,
  };
  const choices = useHistoryChoices(filters);
  const items = usePendingItems(filters.producer, filters);
  const [initial, setInitial] = useState<HealthView>();
  if (!initial && items.isLoaded) {
    setInitial(items.actionable > 0 ? 'pendiente' : 'historial');
  }
  const view = filterState.view ?? initial;
  const request = historyQuery(filters, filterState.page);

  return (
    <div className={pageContainerClass('wide')}>
      <PageHeader
        actions={
          <ScheduleMonitoringLink farm={filters.farm} plot={filters.plot} />
        }
        description="Lo que hay por hacer y el historial de monitoreos y controles de tus parcelas."
        eyebrow="Manejo agrícola"
        title="Sanidad"
      />
      <div className="mt-4 space-y-4">
        <SegmentedControl<HealthView>
          label="Sección de Sanidad"
          onChange={filterState.setView}
          options={[
            {
              value: 'pendiente',
              label:
                items.actionable > 0
                  ? `Pendiente (${items.actionable})`
                  : 'Pendiente',
            },
            { value: 'historial', label: 'Historial' },
          ]}
          value={view ?? 'historial'}
        />
        <HistoryFiltersBar
          farmName={choices.farmName}
          farmOptions={choices.farmOptions}
          filters={filters}
          hasFilters={filterState.hasFilters}
          onClear={filterState.clear}
          onFarm={filterState.setFarm}
          onFrom={filterState.setFrom}
          onPest={filterState.setPest}
          onPlot={filterState.setPlot}
          onProducer={superuser ? filterState.setProducer : undefined}
          onTo={filterState.setTo}
          periodError={
            view === 'historial' && 'error' in request
              ? request.error
              : undefined
          }
          pestOptions={pestFilterOptions(choices.pests, filters.pest)}
          placesOnly={view !== 'historial'}
          plotCode={choices.plotCode}
          plotOptions={choices.plotOptions}
        />
        {view === undefined ? (
          <div aria-label="Cargando" role="status">
            <Skeleton className="h-48" />
          </div>
        ) : view === 'pendiente' ? (
          <PendingTab items={items} producer={filters.producer} />
        ) : (
          <HistoryTab filterState={filterState} filters={filters} />
        )}
      </div>
    </div>
  );
}
