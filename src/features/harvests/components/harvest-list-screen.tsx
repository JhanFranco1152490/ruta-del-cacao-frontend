'use client';

import { cn } from 'cn';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';

import { EditorLink } from '@/components/editor-link';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { PeriodBar } from '@/components/period-bar';
import { ProducerFilter } from '@/components/producer-filter';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMonthParam } from '@/hooks/use-month-param';
import { useQueueItems } from '@/hooks/use-queue-items';
import { useSession } from '@/hooks/use-session';
import { isApiError } from '@/lib/api/errors';
import { useProducerSummary } from '@/lib/api/producer-options';
import { formatMonthYear } from '@/lib/format/dates';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { useHarvestsOfMonth } from '../api';
import { filterHarvests, harvestTotals } from '../harvest-filters';
import { HARVEST_REGISTER_PATH } from '../harvest-paths';
import { HARVEST_RESOURCE, queuedHarvestOf } from '../harvest-queue';
import { harvestFilterOptions, harvestRows } from '../harvest-rows';
import { useHarvestFilters } from '../use-harvest-filters';
import { HarvestFiltersBar } from './harvest-filters-bar';
import { HarvestTable } from './harvest-table';
import { HarvestTotals } from './harvest-totals';

// Las recolecciones de un mes, con sus totales y sus filtros. Sin conexión muestra la última copia
// del mes guardada en el dispositivo, y lo que espera en el teléfono aparece en su fecha.
export function HarvestListScreen() {
  const { data: user } = useSession();
  const superuser = user?.is_superuser === true;
  const period = useMonthParam();
  const filterState = useHarvestFilters();
  const producer = superuser ? filterState.producer : null;
  const read = useHarvestsOfMonth(user?.id, period.month, producer);
  const selectedProducer = useProducerSummary(producer ?? undefined);
  const queue = useQueueItems(user?.id);
  const canRegister = hasPermission(user, PERMISSIONS.HARVESTS_ADD);

  const harvests = useMemo(() => read.data?.data ?? [], [read.data]);
  const queued = useMemo(
    () =>
      (queue ?? [])
        .filter(({ resource }) => resource === HARVEST_RESOURCE)
        .map(queuedHarvestOf),
    [queue],
  );
  const { filters } = filterState;
  const rows = harvestRows({ harvests, queued, month: period.month, filters });
  const waiting = rows.filter(({ queue: inQueue }) => inQueue).length;
  const totals = harvestTotals(filterHarvests(harvests, filters));
  const options = useMemo(() => harvestFilterOptions(harvests), [harvests]);

  const register = canRegister && (
    <EditorLink
      className={cn(buttonVariants({ size: 'office' }), 'h-11')}
      href={HARVEST_REGISTER_PATH}
    >
      <Plus aria-hidden="true" className="size-4" /> Registrar cosecha
    </EditorLink>
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-6 sm:px-8">
      <PageHeader
        actions={register}
        compact
        description="Las recolecciones de cacao de tus parcelas. De cada una se conforma un lote para la poscosecha."
        eyebrow="Producción"
        title="Cosechas"
      />
      {superuser && (
        <ProducerFilter
          className="max-w-md"
          onClear={() => filterState.setProducer(null)}
          onSelect={filterState.setProducer}
          producer={producer ?? undefined}
          selected={selectedProducer}
        />
      )}
      <PeriodBar
        isCurrent={period.isCurrentMonth}
        nextLabel="Mes siguiente"
        onNext={period.goNext}
        onPrevious={period.goPrevious}
        onToday={period.goToday}
        previousLabel="Mes anterior"
        title={formatMonthYear(period.month)}
      />
      {read.data?.savedAt !== undefined && (
        <p
          className="rounded-(--radius) bg-warn-bg px-4 py-3 font-bold text-warn"
          role="status"
        >
          Sin conexión: estás viendo la última copia. Puedes registrar cosechas;
          conformar un lote necesita conexión.
        </p>
      )}
      {read.isPending ? (
        <div aria-label="Cargando cosechas" className="space-y-3" role="status">
          <Skeleton className="h-28" />
          <Skeleton className="h-64" />
        </div>
      ) : read.isError && !read.data ? (
        isApiError(read.error) ? (
          <ErrorState
            message="No fue posible cargar las cosechas."
            onRetry={() => void read.refetch()}
          />
        ) : (
          <EmptyState
            description="Conéctate para verlo; los meses que ya abriste con conexión se pueden consultar sin ella."
            title="Este mes no está guardado en el teléfono."
          />
        )
      ) : (
        <>
          <HarvestTotals
            month={period.month}
            totals={totals}
            waiting={waiting}
          />
          <HarvestFiltersBar options={options} state={filterState} />
          {rows.length > 0 ? (
            <HarvestTable rows={rows} />
          ) : filterState.activeCount > 0 ? (
            <EmptyState
              action={
                <Button
                  onClick={filterState.clear}
                  size="office"
                  variant="outline"
                >
                  Limpiar filtros
                </Button>
              }
              title="No se encontraron cosechas"
            />
          ) : (
            <EmptyState
              action={register}
              description="Las recolecciones que se registren aparecerán aquí, con sus totales."
              title={`No hay cosechas en ${formatMonthYear(period.month)}`}
            />
          )}
        </>
      )}
    </div>
  );
}
