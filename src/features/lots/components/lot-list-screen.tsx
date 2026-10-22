'use client';

import { cn } from 'cn';
import { Wheat } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { ProducerFilter } from '@/components/producer-filter';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/hooks/use-session';
import { useProducerSummary } from '@/lib/api/producer-options';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { LOT_PAGE_SIZE, useLots, useLotSummary } from '../api';
import { useLotFilters } from '../use-lot-filters';
import { LotFiltersBar } from './lot-filters-bar';
import { LotStatusCards } from './lot-status-cards';
import { LotTable } from './lot-table';
import { pageContainerClass } from '@/components/page-container';

// Los lotes de las fincas que la cuenta alcanza, del más reciente al más antiguo. Solo con
// conexión. Un lote se conforma desde su cosecha: `formLotHref` lleva a las que todavía no tienen
// lote, y lo da quien monta la pantalla porque las cosechas son de otro dominio.
export function LotListScreen({ formLotHref }: { formLotHref?: string }) {
  const { data: user } = useSession();
  const superuser = user?.is_superuser === true;
  const filters = useLotFilters();
  const list = useLots(filters.query);
  const summary = useLotSummary(filters.summaryQuery);
  const selectedProducer = useProducerSummary(
    superuser ? filters.query.producer : undefined,
  );
  const canForm = hasPermission(user, PERMISSIONS.LOTS_ADD);

  const formLot = canForm && formLotHref && (
    <Link
      className={cn(buttonVariants({ size: 'office' }), 'h-11')}
      href={formLotHref}
    >
      <Wheat aria-hidden="true" className="size-4" /> Cosechas sin lote
    </Link>
  );

  const content = () => {
    if (list.isPending) {
      return (
        <div aria-label="Cargando lotes" role="status">
          <Skeleton className="h-64" />
        </div>
      );
    }
    if (list.isError) {
      return (
        <ErrorState
          message="No fue posible cargar los lotes."
          onRetry={() => void list.refetch()}
        />
      );
    }
    if (list.data.results.length > 0) {
      return (
        <>
          <LotTable lots={list.data.results} />
          <Pagination
            label="lotes"
            onPageChange={(page) => void filters.setPage(page)}
            page={filters.page}
            pageSize={LOT_PAGE_SIZE}
            total={list.data.count}
          />
        </>
      );
    }
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
        title="No se encontraron lotes"
      />
    ) : (
      <EmptyState
        action={formLot}
        description="Un lote se conforma con una cosecha registrada y recibe ahí su código de trazabilidad."
        title="Aún no hay lotes"
      />
    );
  };

  return (
    <div className={pageContainerClass('wide', 'space-y-5')}>
      <PageHeader
        tone="selva"
        accent="cobre"
        actions={formLot}
        description="Cada lote nace de una cosecha completa y lleva su código de trazabilidad hasta el grano seco."
        eyebrow="Poscosecha"
        title="Lotes"
      />
      {superuser && (
        <ProducerFilter
          className="max-w-md"
          onClear={() => void filters.setProducer(null)}
          onSelect={(id) => void filters.setProducer(id)}
          producer={filters.query.producer}
          selected={selectedProducer}
        />
      )}
      <LotStatusCards
        onChange={(status) => void filters.setStatus(status)}
        totals={summary.data}
        value={filters.query.status}
      />
      <LotFiltersBar state={filters} />
      {content()}
    </div>
  );
}
