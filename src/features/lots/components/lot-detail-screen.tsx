'use client';

import { CalendarDays, Copy, MapPin, Scale, Sprout } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

import { Breadcrumb } from '@/components/breadcrumb';
import { DetailFooter } from '@/components/detail-footer';
import { ErrorState } from '@/components/error-state';
import { OfflineCloud } from '@/components/illustrations/offline-cloud';
import { OfflineCopyNotice } from '@/components/offline-copy-notice';
import { PageNotice } from '@/components/page-notice';
import {
  DetailHero,
  HERO_SECONDARY_CLASS,
} from '@/components/page-blocks/detail-hero';
import { StatCell, StatStrip } from '@/components/page-blocks/stat-strip';
import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session';
import { isNotFound } from '@/lib/api/errors';
import {
  daysBetween,
  formatAbbreviatedDate,
  formatDateTime,
  todayInBogota,
} from '@/lib/format/dates';
import { formatDecimal } from '@/lib/format/decimal';
import { plotLabel } from '@/lib/format/place-label';
import { endSentence } from '@/lib/format/sentence';
import { readOrigin } from '@/lib/navigation/origin';
import { notify } from '@/lib/notify';
import { isNeverLoaded } from '@/lib/offline/paused-read';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { type Lot, useLot } from '../api';
import { LOTS_PATH } from '../lot-paths';
import { LotDeleteDialog } from './lot-delete-dialog';
import { harvestAgeText } from '../lot-age';
import { LotCodeSegments } from './lot-code-segments';
import { LotOrigin } from './lot-origin';
import { LotStages } from './lot-stages';
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

// La ficha de un lote: su código partido en pedazos, sus cifras, en qué etapa va, su origen y, al
// lado, la sección de la etapa que se trabaja. Fermentación y secado son de otros dominios: sus
// secciones, y los enlaces a la cosecha y a la ficha de la parcela, los da quien monta la pantalla.
export function LotDetailScreen({
  lotId,
  harvestHref,
  historyHref,
  renderSections,
}: {
  lotId: string;
  harvestHref?: (lot: Lot) => string;
  historyHref?: (lot: Lot) => string;
  // Lo que va después del origen, en el orden del proceso.
  renderSections?: (lot: Lot) => ReactNode;
}) {
  const { data: user } = useSession();
  const read = useLot(lotId, user?.id);
  // Volver lleva a la pantalla desde la que se abrió (la de Cosechas si se acaba de conformar),
  // con sus filtros, o a la lista de lotes.
  const origin = readOrigin(useSearchParams());

  if (isNeverLoaded(read)) {
    return (
      <PageNotice
        description="Sin conexión solo se abren los lotes en fermentación, si abriste Fermentación antes con conexión."
        illustration={OfflineCloud}
        title="Ver este lote necesita conexión."
      />
    );
  }
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

  const { data: lot, savedAt } = read.data;
  const fromCopy = savedAt !== undefined;
  const { plot } = lot.harvest;
  const canDelete =
    lot.status === 'generated' && hasPermission(user, PERMISSIONS.LOTS_DELETE);
  const harvestAge = daysBetween(lot.harvest.harvest_date, todayInBogota());

  return (
    <div className={pageContainerClass('wide', 'space-y-4')}>
      <Breadcrumb
        items={[{ label: 'Lotes', href: LOTS_PATH }, { label: lot.code }]}
      />
      <DetailHero
        accent="cobre"
        actions={
          <Button
            className={HERO_SECONDARY_CLASS}
            onClick={() => void copyCode(lot.code)}
            size="office"
            variant="outline"
          >
            <Copy aria-hidden="true" className="size-4" /> Copiar código
          </Button>
        }
        chips={<LotStatusBadge status={lot.status} />}
        // La copia de poscosecha no guarda quién conformó el lote ni cuándo.
        description={
          fromCopy
            ? undefined
            : endSentence(
                `Conformado por ${lot.created_by?.full_name ?? 'una cuenta eliminada'} el ${formatDateTime(lot.created_at)}`,
              )
        }
        eyebrow="Lote"
        title={lot.code}
        titleVisual={
          <LotCodeSegments
            code={lot.code}
            farmName={plot.farm.name}
            plotName={plot.name}
          />
        }
        tone="bosque"
      />
      {fromCopy && <OfflineCopyNotice savedAt={savedAt} />}
      <StatStrip accent="cobre" label="Resumen del lote">
        <StatCell
          icon={Scale}
          label="Peso en verde"
          note="cacao en baba"
          value={`${formatDecimal(lot.green_weight_kg, 1)} kg`}
        />
        <StatCell
          icon={CalendarDays}
          label="Cosecha"
          note={harvestAgeText(harvestAge)}
          value={formatAbbreviatedDate(lot.harvest.harvest_date)}
        />
        <StatCell
          icon={Sprout}
          label="Variedad"
          value={lot.harvest.variety.name}
        />
        <StatCell
          icon={MapPin}
          label="Parcela"
          note={plot.farm.name}
          value={plotLabel(plot)}
        />
      </StatStrip>
      <LotStages status={lot.status} />
      {/* En pantallas anchas el origen queda a un lado y la etapa que se trabaja ocupa el resto; en
          celular la etapa va primero, que es lo que se viene a hacer. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4 max-lg:order-2">
          <LotOrigin
            harvestHref={harvestHref?.(lot)}
            historyHref={historyHref?.(lot)}
            lot={lot}
          />
        </div>
        <div className="min-w-0 space-y-4 max-lg:order-1">
          {renderSections?.(lot)}
        </div>
      </div>
      <DetailFooter backHref={origin ?? LOTS_PATH}>
        {canDelete && <LotDeleteDialog lot={lot} />}
      </DetailFooter>
    </div>
  );
}
