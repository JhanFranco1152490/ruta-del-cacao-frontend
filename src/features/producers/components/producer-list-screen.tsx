'use client';

import { UserRoundPlus } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

import { BackLink } from '@/components/back-link';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { buttonVariants } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';

import {
  PAGE_SIZE,
  useMunicipalities,
  useMunicipalityName,
  useProducers,
} from '../api';
import { useProducerFilters } from '../use-producer-filters';
import { ProducerFilters } from './producer-filters';
import { ProducerTableSkeleton } from './producer-skeletons';
import { ProducerTable } from './producer-table';

export function ProducerListScreen() {
  const filters = useProducerFilters();
  const list = useProducers(filters.query);
  const municipalities = useMunicipalities();
  const municipalityName = useMunicipalityName();

  // Una página que ya no existe (se filtró o se borró contenido) no es un error para la persona:
  // se vuelve a la primera.
  const pageMissing =
    isApiError(list.error) && list.error.status === 404 && filters.page > 1;
  const { setPage } = filters;
  useEffect(() => {
    if (pageMissing) void setPage(1);
  }, [pageMissing, setPage]);

  // El error reemplaza la tabla solo si la lista nunca cargó (`isLoadingError`): un refetch
  // fallido en segundo plano conserva `data` y la tabla sigue a la vista.
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-8">
      <BackLink href="/panel">Volver al panel</BackLink>
      <PageHeader
        eyebrow="Administración"
        title="Productores asociados"
        description="Consulta y administra los expedientes de productores de la asociación."
        actions={
          <Link
            className={buttonVariants({ size: 'office' })}
            href="/productores/nuevo"
          >
            <UserRoundPlus aria-hidden="true" className="size-5" /> Registrar
            productor
          </Link>
        }
      />
      <section className="mt-8 rounded-[var(--radius-card)] bg-card p-5 shadow-card">
        <ProducerFilters
          filters={filters}
          municipalities={municipalities.data ?? []}
        />
        <div className="mt-5 overflow-x-auto rounded-[var(--radius)] border border-border">
          {list.isPending || pageMissing ? (
            <ProducerTableSkeleton />
          ) : list.isLoadingError ? (
            <ErrorState
              message="No fue posible cargar los productores. Inténtalo nuevamente."
              onRetry={() => list.refetch()}
            />
          ) : list.data.results.length ? (
            <ProducerTable
              producers={list.data.results}
              municipalityName={municipalityName}
            />
          ) : (
            <EmptyState
              title="No hay productores para mostrar"
              description="Ajusta los filtros o registra el primer productor asociado."
              action={
                <Link
                  className={buttonVariants({
                    size: 'office',
                    className: 'px-4',
                  })}
                  href="/productores/nuevo"
                >
                  Registrar productor
                </Link>
              }
            />
          )}
        </div>
        {list.data && (
          <Pagination
            page={filters.page}
            pageSize={PAGE_SIZE}
            total={list.data.count}
            onPageChange={filters.setPage}
            label="productores"
          />
        )}
      </section>
    </div>
  );
}
