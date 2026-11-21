import type { ReactNode } from 'react';

import { SectionCard } from '@/components/page-blocks/section-card';
import { formatLongDate } from '@/lib/format/dates';
import { farmLabel, plotLabel } from '@/lib/format/place-label';
import { kilosText } from '@/lib/stock-quantity';

import type { LotHistory } from '../../api';
import { harvestGreenKg } from '../../history/origin-links';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="shrink-0 text-xs font-semibold text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-sm font-bold break-words">
        {children}
      </dd>
    </div>
  );
}

// De dónde salió el lote: su finca, su parcela y la cosecha. Va en el panel de al lado de la línea
// de tiempo, en filas cortas para dejarle sitio al índice de etapas; en celular, antes de ella.
export function OriginCard({
  history,
  className,
}: {
  history: LotHistory;
  className?: string;
}) {
  const { farm, plot, harvest } = history.origin;
  const greenKg = harvestGreenKg(history);
  return (
    <SectionCard accent="cobre" className={className} title="Origen del lote">
      <dl className="-my-1.5 divide-y divide-border">
        <Row label="Finca">{`${farmLabel(farm)} · ${farm.municipality}`}</Row>
        <Row label="Parcela">{plotLabel(plot)}</Row>
        <Row label="Cosecha">{formatLongDate(harvest.harvest_date)}</Row>
        <Row label="Cacao en baba">
          {greenKg ? `${kilosText(greenKg)} kg` : '—'}
        </Row>
      </dl>
    </SectionCard>
  );
}
