'use client';

import { ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';

import { EditorLink } from '@/components/editor-link';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FarmHills } from '@/components/illustrations/farm-hills';
import { SectionCard } from '@/components/page-blocks/section-card';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatHectareValue, formatHectares } from '@/lib/format/hectares';

import type { useFarms } from '../api';
import { farmDetailPath } from '../farm-paths';
import { FarmStatusBadge } from './farm-status-badge';

// Las fincas del productor como filas que se abren tocándolas, con su avance de área asignada.
// Columnas de ancho fijo para que la barra y el estado queden alineados entre filas.
// Reemplaza a la tabla: un productor tiene pocas fincas y cinco columnas se cortaban en PC.
export function ProducerFarmRows({
  farms,
  producerId,
  canAdd,
}: {
  farms: ReturnType<typeof useFarms>;
  producerId: string;
  canAdd: boolean;
}) {
  const results = farms.data?.results ?? [];
  const total = farms.data?.count ?? 0;
  return (
    <SectionCard
      accent="cobre"
      actions={
        <>
          <Link
            className={buttonVariants({
              size: 'office',
              variant: 'ghost',
              className: 'h-9 text-sm underline underline-offset-4',
            })}
            href={`/fincas?${new URLSearchParams({ productor: producerId })}`}
          >
            Ver en Fincas
          </Link>
          {canAdd && (
            <EditorLink
              className={buttonVariants({
                size: 'office',
                className: 'h-9 text-sm',
              })}
              href="/fincas/nueva"
            >
              <Plus aria-hidden="true" className="size-4" /> Registrar finca
            </EditorLink>
          )}
        </>
      }
      count={farms.isSuccess ? total : undefined}
      id="fincas-del-productor"
      title="Fincas"
    >
      {farms.isPending && (
        <div aria-label="Cargando fincas" role="status">
          <Skeleton className="h-32" />
        </div>
      )}
      {farms.isError && (
        <ErrorState
          message="No fue posible cargar las fincas del productor."
          onRetry={() => void farms.refetch()}
        />
      )}
      {farms.isSuccess &&
        (total === 0 ? (
          <EmptyState
            description="Cuando se registre una, aparecerá aquí con su área y sus parcelas."
            illustration={FarmHills}
            title="Este productor aún no tiene fincas"
          />
        ) : (
          <ul aria-label="Fincas del productor" className="-mx-2">
            {results.map((farm) => {
              const area = Number(farm.area_hectares);
              const allocated = Number(farm.allocated_area_hectares ?? 0);
              const share = area > 0 ? (allocated / area) * 100 : 0;
              return (
                <li
                  className="border-t border-border first:border-t-0"
                  key={farm.id}
                >
                  <Link
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 rounded-lg px-2 py-3 hover:bg-muted sm:grid-cols-[minmax(0,1fr)_11rem_6.5rem_1.25rem]"
                    href={farmDetailPath(farm.id)}
                  >
                    <span className="min-w-0">
                      <span className="block font-bold break-words text-foreground">
                        {farm.name}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {farm.municipality.name} ·{' '}
                        {formatHectares(farm.area_hectares)}
                      </span>
                    </span>
                    <span className="col-span-2 text-xs text-muted-foreground max-sm:order-last sm:col-span-1">
                      {formatHectareValue(farm.allocated_area_hectares)} de{' '}
                      {formatHectares(farm.area_hectares)} en parcelas
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full bg-[var(--mod)]"
                          style={{
                            width: `${Math.min(100, Math.max(share, allocated > 0 ? 2 : 0))}%`,
                          }}
                        />
                      </span>
                    </span>
                    <FarmStatusBadge
                      status={farm.is_active ? 'active' : 'inactive'}
                    />
                    <ChevronRight
                      aria-hidden="true"
                      className="size-5 text-muted-foreground max-sm:hidden"
                    />
                    <span className="sr-only">Ver detalle de {farm.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ))}
    </SectionCard>
  );
}
