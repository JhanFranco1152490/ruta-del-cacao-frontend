'use client';

import { cn } from 'cn';
import { ChevronRight, Eye, Plus } from 'lucide-react';
import Link from 'next/link';

import {
  COMPACT_TABLE_CLASS,
  ROW_LINK_CLASS,
} from '@/components/compact-table-class';
import { EditorLink } from '@/components/editor-link';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSession } from '@/hooks/use-session';
import { formatHectareValue, formatHectares } from '@/lib/format/hectares';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { type Farm, useFarms } from '../api';
import { farmDetailPath } from '../farm-paths';
import { FarmStatusBadge } from './farm-status-badge';

const sumHectares = (farms: readonly Farm[], field: keyof Farm) =>
  farms.reduce((total, farm) => total + Number(farm[field] ?? 0), 0);

function Stat({
  label,
  value,
  note,
  percentage,
}: {
  label: string;
  value: string;
  note?: string;
  // Cuánto de algo está cubierto: se dibuja como una barra bajo el valor.
  percentage?: number;
}) {
  return (
    <div className="rounded-[var(--radius-card)] bg-card p-3 shadow-card sm:p-4">
      <p className="section-label">{label}</p>
      <p className="mt-1 font-serif text-2xl text-selva sm:text-3xl">{value}</p>
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
      {percentage !== undefined && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-selva"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Los totales de las fincas del productor: tres cuadros que la ficha pone en su fila de resumen.
export function ProducerFarmStats({ producerId }: { producerId: string }) {
  const { data: user } = useSession();
  const farms = useFarms({ producer: producerId });
  if (!hasPermission(user, PERMISSIONS.FARMS_VIEW) || !farms.isSuccess) {
    return null;
  }
  const results = farms.data.results;
  const total = farms.data.count;
  // Con más fincas de las que trae la primera página las sumas serían de una parte: se dice.
  const partial = total > results.length;
  const area = sumHectares(results, 'area_hectares');
  const allocated = sumHectares(results, 'allocated_area_hectares');
  const percentage = area > 0 ? Math.round((allocated / area) * 100) : 0;
  return (
    <>
      <Stat label="Fincas" value={String(total)} />
      <Stat
        label="Área"
        note={partial ? `De las primeras ${results.length}` : undefined}
        value={formatHectares(String(area))}
      />
      <Stat
        label="En parcelas"
        note={`${percentage} % del área`}
        percentage={percentage}
        value={formatHectares(String(allocated))}
      />
    </>
  );
}

// La tabla de las fincas de un productor en su ficha; desde cada fila se abre su detalle. Quien solo
// mira productores y no fincas no la ve.
export function ProducerFarmsList({ producerId }: { producerId: string }) {
  const { data: user } = useSession();
  const canView = hasPermission(user, PERMISSIONS.FARMS_VIEW);
  const canAdd = hasPermission(user, PERMISSIONS.FARMS_ADD);
  const farms = useFarms({ producer: producerId });

  if (!canView) return null;

  const results = farms.data?.results ?? [];
  const total = farms.data?.count ?? 0;

  return (
    <section
      aria-labelledby="producer-farms-heading"
      className="space-y-4 rounded-[var(--radius-card)] bg-card p-4 shadow-card sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl text-selva" id="producer-farms-heading">
          Fincas de este productor
          {farms.isSuccess ? ` · ${total}` : ''}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link
            className={buttonVariants({ size: 'office', variant: 'action' })}
            href={`/fincas?${new URLSearchParams({ productor: producerId })}`}
          >
            Ver en Fincas
          </Link>
          {canAdd && (
            <EditorLink
              className={buttonVariants({ size: 'office' })}
              href="/fincas/nueva"
            >
              <Plus aria-hidden="true" className="size-4" /> Registrar finca
            </EditorLink>
          )}
        </div>
      </div>
      {farms.isPending && (
        <div aria-label="Cargando fincas" role="status">
          <Skeleton className="h-40" />
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
            title="Este productor aún no tiene fincas"
          />
        ) : (
          <>
            <Table
              aria-label="Fincas del productor"
              className={COMPACT_TABLE_CLASS}
            >
              <TableHeader>
                <TableRow>
                  <TableHead>Finca</TableHead>
                  <TableHead>Municipio</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>En parcelas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((farm) => (
                  <TableRow key={farm.id}>
                    <TableCell className="max-w-64 font-bold break-words whitespace-normal max-md:order-1 max-md:col-span-1! max-md:text-base! max-md:text-foreground">
                      {farm.name}
                    </TableCell>
                    <TableCell className="max-md:order-3 max-md:col-span-1! max-md:text-muted-foreground">
                      {farm.municipality.name}
                    </TableCell>
                    <TableCell className="max-md:order-4 max-md:col-span-1! max-md:justify-self-end">
                      {formatHectares(farm.area_hectares)}
                    </TableCell>
                    <TableCell className="max-md:order-5 max-md:text-muted-foreground">
                      {formatHectareValue(farm.allocated_area_hectares)} de{' '}
                      {formatHectares(farm.area_hectares)}
                    </TableCell>
                    <TableCell className="max-md:order-2 max-md:col-span-1! max-md:justify-self-end">
                      <FarmStatusBadge
                        status={farm.is_active ? 'active' : 'inactive'}
                      />
                    </TableCell>
                    <TableCell className="max-md:order-6">
                      <Link
                        aria-label={`Ver detalle de ${farm.name}`}
                        className={cn(
                          buttonVariants({ size: 'office', variant: 'action' }),
                          ROW_LINK_CLASS,
                        )}
                        href={farmDetailPath(farm.id)}
                      >
                        <Eye
                          aria-hidden="true"
                          className="size-4 max-md:hidden"
                        />
                        <span className="max-md:sr-only">Ver detalle</span>
                        <ChevronRight
                          aria-hidden="true"
                          className="md:hidden"
                        />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        ))}
    </section>
  );
}
