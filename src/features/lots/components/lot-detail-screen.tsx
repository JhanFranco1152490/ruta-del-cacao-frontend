'use client';

import { Copy } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { Breadcrumb } from '@/components/breadcrumb';
import { DetailFooter } from '@/components/detail-footer';
import { ErrorState } from '@/components/error-state';
import { PageNotice } from '@/components/page-notice';
import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session';
import { isNotFound } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/format/dates';
import { readLotCode } from '@/lib/format/lot-code';
import { readOrigin } from '@/lib/navigation/origin';
import { notify } from '@/lib/notify';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { type Lot, useLot } from '../api';
import { LOTS_PATH } from '../lot-paths';
import { LotDeleteDialog } from './lot-delete-dialog';
import { LotOrigin } from './lot-origin';
import { LotStatusBadge } from './lot-status-badge';
import { pageContainerClass } from '@/components/page-container';
import { LoadingBlock } from '@/components/loading-block';

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
  // Volver lleva a la pantalla desde la que se abrió (la de Cosechas si se acaba de conformar),
  // con sus filtros, o a la lista de lotes.
  const origin = readOrigin(useSearchParams());

  if (read.isError) {
    return isNotFound(read.error) ? (
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
      <LoadingBlock
        className={pageContainerClass('narrow', 'space-y-4')}
        label="Cargando lote"
        shapes={['h-24', 'h-64']}
      />
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
    <div className={pageContainerClass('narrow', 'space-y-6')}>
      <Breadcrumb
        items={[{ label: 'Lotes', href: LOTS_PATH }, { label: lot.code }]}
      />
      {/* La cabecera del lote es un banner bosque, como la de los demás detalles del campo. */}
      <section className="space-y-4 rounded-[var(--radius-card)] bg-selva-2 p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-bold tracking-[0.12em] text-[#e8c873] uppercase">
            Lote
          </p>
          <LotStatusBadge status={lot.status} />
        </div>
        <h1 className="font-mono text-xl font-bold break-all sm:text-3xl">
          {lot.code}
        </h1>
        <Button
          className="h-11 border-white/60 bg-transparent text-white hover:bg-white/10"
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
        <p className="text-sm text-white/80">
          Conformado por {lot.created_by?.full_name ?? 'una cuenta eliminada'}{' '}
          el {formatDateTime(lot.created_at)}.
        </p>
      </section>
      <LotOrigin
        harvestHref={harvestHref?.(lot)}
        historyHref={historyHref?.(lot)}
        lot={lot}
      />
      <DetailFooter backHref={origin ?? LOTS_PATH}>
        {canDelete && <LotDeleteDialog lot={lot} />}
      </DetailFooter>
    </div>
  );
}
