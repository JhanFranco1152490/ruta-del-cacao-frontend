'use client';

import { cn } from 'cn';
import { CalendarDays, FileText, Home, MapPin, Scale } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { Breadcrumb } from '@/components/breadcrumb';
import { DetailFooter } from '@/components/detail-footer';
import { EditorLink } from '@/components/editor-link';
import { ErrorState } from '@/components/error-state';
import { OfflineCloud } from '@/components/illustrations/offline-cloud';
import { LoadingBlock } from '@/components/loading-block';
import { accentStyle } from '@/components/page-blocks/accent';
import {
  DetailHero,
  HERO_SECONDARY_CLASS,
} from '@/components/page-blocks/detail-hero';
import { StatCell, StatStrip } from '@/components/page-blocks/stat-strip';
import { pageContainerClass } from '@/components/page-container';
import { PageNotice } from '@/components/page-notice';
import { LotStatusBadge } from '@/components/lot-status-badge';
import { buttonVariants } from '@/components/ui/button';
import { isNotFound } from '@/lib/api/errors';
import { formatLongDate } from '@/lib/format/dates';
import { farmLabel, plotLabel } from '@/lib/format/place-label';
import { readOrigin } from '@/lib/navigation/origin';
import { isNeverLoaded } from '@/lib/offline/paused-read';
import { kilosText } from '@/lib/stock-quantity';

import { type LotHistory, useLotHistory } from '../../api';
import { harvestGreenKg, type OriginLinks } from '../../history/origin-links';
import { LOTS_PATH, lotDetailPath } from '../../lot-paths';
import { LotCodeSegments } from '../lot-code-segments';
import { CurrentStateEntry } from './current-state-entry';
import { HistoryStage } from './history-stage';
import { OriginLinksRow } from './origin-links-row';

// La historia de un lote: de la cosecha a hoy, una entrada por etapa en el orden que da el
// servidor, y al final su estado actual. Solo con conexión: junta lo que guardan seis módulos y no
// tiene copia en el dispositivo. Los enlaces a otros dominios los da quien monta la pantalla.
export function LotHistoryScreen({
  lotId,
  originLinks,
}: {
  lotId: string;
  originLinks?: (history: LotHistory) => OriginLinks;
}) {
  const read = useLotHistory(lotId);
  const origin = readOrigin(useSearchParams());

  if (isNeverLoaded(read)) {
    return (
      <PageNotice
        description="Vuelve a abrirla cuando tengas conexión."
        illustration={OfflineCloud}
        title="Ver la historia del lote necesita conexión."
      />
    );
  }
  if (read.isError) {
    // El mismo aviso para un lote que no existe y para uno de otro productor: no se confirma que
    // exista un lote ajeno.
    return isNotFound(read.error) ? (
      <PageNotice title="No se encontró el lote." />
    ) : (
      <ErrorState
        message="No fue posible cargar la historia del lote."
        onRetry={() => void read.refetch()}
      />
    );
  }
  if (!read.data) {
    return (
      <LoadingBlock
        className={pageContainerClass('narrow', 'space-y-4')}
        label="Cargando la historia del lote"
        shapes={['h-24', 'h-20', 'h-64']}
      />
    );
  }

  const history = read.data;
  const { lot, origin: source } = history;
  const detailHref = lotDetailPath(lot.id);
  const greenKg = harvestGreenKg(history);

  return (
    <div className={pageContainerClass('narrow', 'space-y-4')}>
      <Breadcrumb
        items={[
          { label: 'Lotes', href: LOTS_PATH },
          { label: lot.code, href: detailHref },
          { label: 'Historia' },
        ]}
      />
      <DetailHero
        accent="cobre"
        actions={
          <EditorLink
            className={cn(
              buttonVariants({ size: 'office', variant: 'outline' }),
              HERO_SECONDARY_CLASS,
            )}
            href={detailHref}
          >
            <FileText aria-hidden="true" className="size-4" /> Ficha del lote
          </EditorLink>
        }
        chips={<LotStatusBadge status={lot.status} />}
        description={`Productor ${source.producer.member_code} · ${source.producer.full_name}`}
        eyebrow="Historia del lote"
        title={`Historia del lote ${lot.code}`}
        titleVisual={
          <LotCodeSegments
            code={lot.code}
            farmName={source.farm.name}
            plotName={source.plot.name}
          />
        }
        tone="bosque"
      />
      <StatStrip accent="cobre" label="Origen del lote">
        <StatCell
          icon={Home}
          label="Finca"
          note={source.farm.municipality}
          value={farmLabel(source.farm)}
        />
        <StatCell
          icon={MapPin}
          label="Parcela"
          value={plotLabel(source.plot)}
        />
        <StatCell
          icon={CalendarDays}
          label="Cosecha"
          value={formatLongDate(source.harvest.harvest_date)}
        />
        <StatCell
          icon={Scale}
          label="Cacao en baba"
          value={greenKg ? `${kilosText(greenKg)} kg` : '—'}
        />
      </StatStrip>
      <ol
        aria-label="Etapas del lote"
        className="motion-stagger space-y-4"
        style={accentStyle('cobre')}
      >
        {history.stages.map((stage, index) => (
          <HistoryStage
            harvestFooter={
              originLinks && <OriginLinksRow links={originLinks(history)} />
            }
            key={`${stage.kind}-${index}`}
            stage={stage}
          />
        ))}
        <CurrentStateEntry current={history.current} />
      </ol>
      <DetailFooter backHref={origin ?? detailHref} />
    </div>
  );
}
