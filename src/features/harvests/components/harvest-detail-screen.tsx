'use client';

import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

import { Breadcrumb } from '@/components/breadcrumb';
import { DetailFooter } from '@/components/detail-footer';
import { EditorLink } from '@/components/editor-link';
import { OfflineCloud } from '@/components/illustrations/offline-cloud';
import { PageHeader } from '@/components/page-header';
import { PageNotice } from '@/components/page-notice';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/hooks/use-session';
import { isApiError } from '@/lib/api/errors';
import { formatDecimal } from '@/lib/format/decimal';
import { formatDateTime, formatLongDate } from '@/lib/format/dates';
import { farmLabel, plotLabel } from '@/lib/format/place-label';
import { readOrigin } from '@/lib/navigation/origin';

import { type Harvest, useHarvest } from '../api';
import type { HarvestLotSource } from '../harvest-lot-source';
import { HARVESTS_PATH } from '../harvest-paths';
import { HarvestDetailActions } from './harvest-detail-actions';
import { HarvestFacts } from './harvest-facts';
import { pageContainerClass } from '@/components/page-container';
import { LoadingBlock } from '@/components/loading-block';

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
  renderFormLot?: (source: HarvestLotSource) => ReactNode;
  lotHref?: (lotId: string) => string;
  historyHref?: (harvest: Harvest) => string;
}) {
  const { data: user } = useSession();
  const read = useHarvest(user?.id, harvestId);
  // Volver lleva a la pantalla desde la que se abrió, con sus filtros, o a la lista.
  const backHref = readOrigin(useSearchParams()) ?? HARVESTS_PATH;

  if (read.isError) {
    return isApiError(read.error) && read.error.status === 404 ? (
      <PageNotice title="Esta cosecha ya no existe." />
    ) : (
      <PageNotice
        description="Ábrela una vez con conexión desde Cosechas y quedará guardada en el teléfono."
        illustration={OfflineCloud}
        title="Necesitas conexión para ver esta cosecha."
      />
    );
  }
  if (!read.data) {
    return (
      <LoadingBlock
        className={pageContainerClass('narrow', 'space-y-4')}
        label="Cargando cosecha"
        shapes={['h-12 w-2/3', 'h-64']}
      />
    );
  }

  const { data: harvest, savedAt } = read.data;

  return (
    <div className={pageContainerClass('narrow', 'space-y-6')}>
      <Breadcrumb
        items={[
          { label: 'Cosechas', href: HARVESTS_PATH },
          { label: formatLongDate(harvest.harvest_date) },
        ]}
      />
      <PageHeader
        tone="bosque"
        accent="cobre"
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
            <EditorLink
              className="font-mono underline"
              href={lotHref(harvest.lot.id)}
            >
              {harvest.lot.code}
            </EditorLink>
          ) : (
            <span className="font-mono">{harvest.lot.code}</span>
          )}
          : ya no se puede modificar.
        </p>
      )}
      <HarvestFacts harvest={harvest} historyHref={historyHref} />
      <DetailFooter backHref={backHref}>
        {!harvest.lot && (
          <HarvestDetailActions
            harvest={harvest}
            renderFormLot={renderFormLot}
          />
        )}
      </DetailFooter>
    </div>
  );
}
