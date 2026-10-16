'use client';

import { Copy } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { BackLink } from '@/components/back-link';
import { Breadcrumb } from '@/components/breadcrumb';
import { ErrorState } from '@/components/error-state';
import { PageNotice } from '@/components/page-notice';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/hooks/use-session';
import { isApiError } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/format/dates';
import { readLotCode } from '@/lib/format/lot-code';
import { NAV_ITEMS, navItemForPath } from '@/config/navigation';
import { readOrigin } from '@/lib/navigation/origin';
import { notify } from '@/lib/notify';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { type Lot, useLot } from '../api';
import { LOTS_PATH } from '../lot-paths';
import { LotDeleteDialog } from './lot-delete-dialog';
import { LotOrigin } from './lot-origin';
import { LotStatusBadge } from './lot-status-badge';

// «Volver a Cosechas»: la sección del menú a la que pertenece la pantalla de origen.
function backLabel(origin: string) {
  const section = navItemForPath(NAV_ITEMS, origin.split('?')[0]);
  return section ? `Volver a ${section.label}` : 'Volver';
}

async function copyCode(code: string) {
  try {
    await navigator.clipboard.writeText(code);
    notify.success('Código copiado');
  } catch {
    notify.error('No fue posible copiar el código. Selecciónalo y cópialo.');
  }
}

// La ficha de un lote: su código, cómo se lee, su estado y su origen. Fermentación y secado
// agregarán aquí sus secciones. Los enlaces a la cosecha y a la ficha de la parcela los da quien
// monta la pantalla.
export function LotDetailScreen({
  lotId,
  harvestHref,
  historyHref,
}: {
  lotId: string;
  harvestHref?: (lot: Lot) => string;
  historyHref?: (lot: Lot) => string;
}) {
  const { data: user } = useSession();
  const read = useLot(lotId);
  // Recién conformado, el lote recuerda la pantalla de Cosechas desde la que se conformó.
  const origin = readOrigin(useSearchParams());

  if (read.isError) {
    return isApiError(read.error) && read.error.status === 404 ? (
      <PageNotice title="Este lote ya no existe." />
    ) : (
      <ErrorState
        message="No fue posible cargar el lote."
        onRetry={() => void read.refetch()}
      />
    );
  }
  if (!read.data) {
    return (
      <div
        aria-label="Cargando lote"
        className="mx-auto max-w-3xl space-y-4 px-4 py-8"
        role="status"
      >
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const lot = read.data;
  const { plot } = lot.harvest;
  const reading = readLotCode(lot.code, {
    farmName: plot.farm.name,
    plotName: plot.name,
  });
  const canDelete =
    lot.status === 'generated' && hasPermission(user, PERMISSIONS.LOTS_DELETE);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-8">
      {origin && <BackLink href={origin}>{backLabel(origin)}</BackLink>}
      <Breadcrumb
        items={[{ label: 'Lotes', href: LOTS_PATH }, { label: lot.code }]}
      />
      <section className="space-y-4 rounded-(--radius) border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-muted-foreground">Lote</p>
          <LotStatusBadge status={lot.status} />
        </div>
        <h1 className="font-mono text-2xl font-bold break-all sm:text-3xl">
          {lot.code}
        </h1>
        <Button
          className="h-11"
          onClick={() => void copyCode(lot.code)}
          size="office"
          variant="outline"
        >
          <Copy aria-hidden="true" className="size-4" /> Copiar código
        </Button>
        {reading && (
          <div className="space-y-1">
            <h2 className="text-sm font-bold">Cómo se lee este código</h2>
            <p>{reading}</p>
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Conformado por {lot.created_by?.full_name ?? 'una cuenta eliminada'}{' '}
          el {formatDateTime(lot.created_at)}.
        </p>
      </section>
      <LotOrigin
        harvestHref={harvestHref?.(lot)}
        historyHref={historyHref?.(lot)}
        lot={lot}
      />
      {canDelete && <LotDeleteDialog lot={lot} />}
    </div>
  );
}
