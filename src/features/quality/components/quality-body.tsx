'use client';

import type { ReactNode } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { CutTest } from '@/components/illustrations/cut-test';
import { LoadingBlock } from '@/components/loading-block';
import { NeverLoadedState } from '@/components/never-loaded-state';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { formatMonthYear } from '@/lib/format/dates';
import { isNeverLoaded } from '@/lib/offline/paused-read';
import type { QualityAction } from '@/lib/paths/quality';

import type { LotQuality } from '../api';
import { groupByClosingMonth } from '../closed-groups';
import { qualityActions } from '../quality-actions';
import type { QualityView } from '../use-quality-filters';
import type { QualityScreenState } from '../use-quality-screen';
import { QualityCard } from './quality-card';

// El tamaño de página del servidor.
export const QUALITY_PAGE_SIZE = 20;

const EMPTY: Record<QualityView, string> = {
  'por-evaluar': 'No hay lotes secos por evaluar.',
  evaluados: 'No hay lotes evaluados por clasificar.',
  cerrados: 'Todavía no se ha clasificado ni descartado ningún lote.',
};

const LIST_LABEL: Record<QualityView, string> = {
  'por-evaluar': 'Lotes por evaluar',
  evaluados: 'Lotes evaluados',
  cerrados: 'Lotes cerrados',
};

const CARD_GRID_CLASS =
  'motion-stagger grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3';

// Los cerrados de la página, en secciones por mes de cierre: con el tiempo son muchos y el mes dice
// dónde se está en la lista.
function ClosedMonths({
  lots,
  renderCard,
}: {
  lots: readonly LotQuality[];
  renderCard: (lot: LotQuality) => ReactNode;
}) {
  return (
    <div className="space-y-5">
      {groupByClosingMonth(lots).map(({ month, lots: monthLots }) => (
        <section aria-label={monthTitle(month)} key={month || 'sin-fecha'}>
          <h3 className="mb-2 text-sm font-bold text-selva first-letter:uppercase">
            {monthTitle(month)}
            <span className="ml-2 font-normal text-muted-foreground">
              {monthLots.length === 1 ? '1 lote' : `${monthLots.length} lotes`}
            </span>
          </h3>
          <ul
            aria-label={`Lotes cerrados en ${monthTitle(month)}`}
            className={CARD_GRID_CLASS}
          >
            {monthLots.map(renderCard)}
          </ul>
        </section>
      ))}
    </div>
  );
}

const monthTitle = (month: string) =>
  month ? formatMonthYear(month) : 'Sin fecha';

// La pestaña elegida de Calidad, o el estado que la reemplaza mientras no hay qué mostrar.
export function QualityBody({
  screen,
  lotHref,
  onAction,
}: {
  screen: QualityScreenState;
  lotHref: (id: string) => string;
  onAction: (lot: LotQuality, action: QualityAction) => void;
}) {
  const { filters, list } = screen;

  if (screen.needsProducer) {
    return (
      <p className="text-muted-foreground">
        Elige un productor para ver sus lotes de calidad.
      </p>
    );
  }
  if (isNeverLoaded(list)) {
    return <NeverLoadedState subject="los lotes de calidad" />;
  }
  if (list.isPending) {
    return <LoadingBlock label="Cargando lotes" shapes={['h-40']} />;
  }
  if (!list.data) {
    return (
      <ErrorState
        message="No fue posible cargar los lotes de calidad."
        onRetry={() => void list.refetch()}
      />
    );
  }
  const page = list.data.data;
  if (page.results.length === 0) {
    return filters.hasFilters ? (
      <EmptyState
        action={
          <Button
            onClick={() => void filters.clear()}
            size="office"
            variant="outline"
          >
            Limpiar filtros
          </Button>
        }
        illustration={CutTest}
        title="Ningún lote coincide con los filtros."
      />
    ) : (
      <EmptyState illustration={CutTest} title={EMPTY[filters.view]} />
    );
  }
  const card = (lot: LotQuality) => (
    <QualityCard
      key={lot.lot.id}
      lot={lot}
      lotHref={lotHref}
      offers={qualityActions({
        status: lot.lot.status,
        online: !screen.offline,
        can: screen.can,
      })}
      onAction={onAction}
    />
  );
  return (
    <>
      {filters.view === 'cerrados' ? (
        <ClosedMonths lots={page.results} renderCard={card} />
      ) : (
        <ul aria-label={LIST_LABEL[filters.view]} className={CARD_GRID_CLASS}>
          {page.results.map(card)}
        </ul>
      )}
      {!screen.offline && (
        <Pagination
          label="lotes"
          onPageChange={(next) => void filters.setPage(next)}
          page={filters.filters.page}
          pageSize={QUALITY_PAGE_SIZE}
          total={page.count}
        />
      )}
    </>
  );
}
