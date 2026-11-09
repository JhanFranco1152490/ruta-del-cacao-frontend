'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { OfflineCopyNotice } from '@/components/offline-copy-notice';
import { pageContainerClass } from '@/components/page-container';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { PeriodBar } from '@/components/period-bar';
import { ProducerFilter } from '@/components/producer-filter';
import { Button } from '@/components/ui/button';
import { useCurrentPath } from '@/hooks/use-current-path';
import { formatMonthYear } from '@/lib/format/dates';
import { withOrigin } from '@/lib/navigation/origin';

import { OFFLINE_SALES_REASON } from '../sale-messages';
import { newSalePath, saleDetailPath } from '../sale-paths';
import { useSalesScreen } from '../use-sales-screen';
import { SaleFiltersBar } from './sale-filters-bar';
import { SaleListStates } from './sale-list-states';
import { SaleSummaryStrip } from './sale-summary-strip';
import { SaleTable } from './sale-table';

// El tamaño de página del servidor.
export const SALES_PAGE_SIZE = 20;

// Las ventas de cada mes, con sus cifras y sus filtros. Se consultan también sin conexión, con la
// copia del dispositivo; registrar necesita conexión.
export function SalesScreen() {
  const screen = useSalesScreen();
  const { filters } = screen;
  const router = useRouter();
  const current = useCurrentPath();
  const { period } = filters;

  const register = screen.register && (
    <Button
      disabled={screen.register.disabledReason !== null}
      onClick={() =>
        router.push(withOrigin(newSalePath(filters.filters.farm), current))
      }
      size="office"
      title={screen.register.disabledReason ?? undefined}
    >
      <Plus aria-hidden="true" className="size-5" /> Registrar venta
    </Button>
  );

  return (
    <div className={pageContainerClass('wide', 'space-y-5')}>
      <PageHeader
        accent="cobre"
        actions={register || undefined}
        description="Lo que le vendes a cada comprador: los lotes, los kilos de cada calibre y su valor."
        eyebrow="Comercialización"
        title="Ventas"
        tone="selva"
      />
      {/* El filtro de productor a la izquierda y el mes a la derecha, como en Cosechas. */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        {screen.superuser && (
          <ProducerFilter
            className="w-full max-w-md"
            onClear={() => void filters.setProducer(null)}
            onSelect={(id) => void filters.setProducer(id)}
            producer={screen.producer ?? undefined}
            selected={screen.selectedProducer}
          />
        )}
        <div className="ml-auto max-sm:w-full">
          <PeriodBar
            isCurrent={period.isCurrentMonth}
            nextLabel="Mes siguiente"
            onNext={period.goNext}
            onPrevious={period.goPrevious}
            onToday={period.goToday}
            previousLabel="Mes anterior"
            title={formatMonthYear(period.month)}
          />
        </div>
      </div>
      {!screen.needsProducer && (
        <SaleSummaryStrip summary={screen.summary.data?.data} />
      )}
      {screen.sales.isSuccess && screen.offline && (
        <OfflineCopyNotice
          consequence={OFFLINE_SALES_REASON}
          savedAt={screen.savedAt}
        />
      )}
      <section className="space-y-5 rounded-lg bg-card p-5 shadow-card">
        {!screen.needsProducer && <SaleFiltersBar screen={screen} />}
        <SaleListStates register={register} screen={screen}>
          <SaleTable
            detailHref={(id) => withOrigin(saleDetailPath(id), current)}
            sales={screen.rows}
          />
          {!screen.offline && (
            <Pagination
              label="ventas"
              onPageChange={(next) => void filters.setPage(next)}
              page={filters.filters.page}
              pageSize={SALES_PAGE_SIZE}
              total={screen.total}
            />
          )}
        </SaleListStates>
      </section>
    </div>
  );
}
