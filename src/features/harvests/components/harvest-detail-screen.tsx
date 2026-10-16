'use client';

import { cn } from 'cn';
import { Pencil } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Breadcrumb } from '@/components/breadcrumb';
import { EditorLink } from '@/components/editor-link';
import { PageHeader } from '@/components/page-header';
import { PageNotice } from '@/components/page-notice';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { isApiError } from '@/lib/api/errors';
import { formatDecimal } from '@/lib/format/decimal';
import { formatDateTime, formatLongDate } from '@/lib/format/dates';
import { farmLabel, plotLabel } from '@/lib/format/place-label';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { type Harvest, useHarvest } from '../api';
import { harvestCorrectionPath, HARVESTS_PATH } from '../harvest-paths';
import { HarvestDeleteDialog } from './harvest-delete-dialog';
import { HarvestFacts } from './harvest-facts';

// Lo registrado de una recolección. La consulta no modifica: corregir y eliminar son acciones
// aparte, solo mientras la cosecha no forme un lote y con conexión. Los lotes y la ficha son de
// otros dominios: quien monta la pantalla entrega cómo conformar el lote y a dónde llevan los
// enlaces.
export function HarvestDetailScreen({
  harvestId,
  renderFormLot,
  lotHref,
  historyHref,
}: {
  harvestId: string;
  renderFormLot?: (harvest: Harvest) => ReactNode;
  lotHref?: (lotId: string) => string;
  historyHref?: (harvest: Harvest) => string;
}) {
  const { data: user } = useSession();
  const hasConnection = useHasConnection();
  const read = useHarvest(user?.id, harvestId);

  if (read.isError) {
    return isApiError(read.error) && read.error.status === 404 ? (
      <PageNotice title="Esta cosecha ya no existe." />
    ) : (
      <PageNotice
        description="Ábrela una vez con conexión desde Cosechas y quedará guardada en el teléfono."
        title="Necesitas conexión para ver esta cosecha."
      />
    );
  }
  if (!read.data) {
    return (
      <div
        aria-label="Cargando cosecha"
        className="mx-auto max-w-3xl space-y-4 px-4 py-8"
        role="status"
      >
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { data: harvest, savedAt } = read.data;
  const editable = !harvest.lot;
  const canCorrect =
    editable && hasPermission(user, PERMISSIONS.HARVESTS_CHANGE);
  const canDelete =
    editable && hasPermission(user, PERMISSIONS.HARVESTS_DELETE);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-8">
      <Breadcrumb
        items={[
          { label: 'Cosechas', href: HARVESTS_PATH },
          { label: formatLongDate(harvest.harvest_date) },
        ]}
      />
      <PageHeader
        compact
        description={`${plotLabel(harvest.plot)} · ${farmLabel(harvest.plot.farm)}`}
        eyebrow="Cosecha"
        title={`${formatDecimal(harvest.green_weight_kg, 1)} kg en verde`}
      />
      {savedAt !== undefined && (
        <p
          className="rounded-(--radius) bg-warn-bg px-4 py-3 font-bold text-warn"
          role="status"
        >
          Sin conexión: estás viendo la copia del{' '}
          {formatDateTime(new Date(savedAt).toISOString())}.
        </p>
      )}
      {harvest.lot && (
        <p
          className="rounded-(--radius) bg-info-bg px-4 py-3 font-bold"
          role="status"
        >
          Esta cosecha forma el lote{' '}
          {lotHref ? (
            <Link
              className="font-mono underline"
              href={lotHref(harvest.lot.id)}
            >
              {harvest.lot.code}
            </Link>
          ) : (
            <span className="font-mono">{harvest.lot.code}</span>
          )}
          : ya no se puede modificar.
        </p>
      )}
      <HarvestFacts harvest={harvest} historyHref={historyHref} />
      {editable && (
        <div className="flex flex-wrap gap-3">
          {renderFormLot?.(harvest)}
          {canCorrect &&
            (hasConnection ? (
              <EditorLink
                className={cn(
                  buttonVariants({ size: 'office', variant: 'outline' }),
                  'h-11',
                )}
                href={harvestCorrectionPath(harvest.id)}
              >
                <Pencil aria-hidden="true" className="size-4" /> Corregir
                cosecha
              </EditorLink>
            ) : (
              <Button className="h-11" disabled size="office" variant="outline">
                Corregir (necesita conexión)
              </Button>
            ))}
          {canDelete &&
            (hasConnection ? (
              <HarvestDeleteDialog harvest={harvest} />
            ) : (
              <Button className="h-11" disabled size="office" variant="outline">
                Eliminar (necesita conexión)
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}
