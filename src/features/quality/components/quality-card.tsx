import { farmLabel } from '@/lib/format/place-label';
import type { QualityAction } from '@/lib/paths/quality';

import { LotStatusBadge } from '@/components/lot-status-badge';

import type { LotQuality } from '../api';
import {
  classificationFacts,
  closedByLine,
  gradeShares,
  discardLine,
  dryLine,
  evaluatedByLine,
  evaluationFacts,
} from '../quality-card-facts';
import type { QualityActionOffer } from '../quality-actions';
import { LotViewLink } from './lot-view-link';
import { QualityCardActions } from './quality-card-actions';
import { QualityGradeBar } from './quality-grade-bar';
import { QualityFacts } from './quality-facts';

// Un lote en Calidad. Lo que muestra depende de dónde va: seco por evaluar (peso, humedad y fin del
// secado), evaluado (los tres porcentajes y quién evaluó) o cerrado (la clasificación o el motivo
// del descarte, con su estado).
export function QualityCard({
  lot,
  offers,
  lotHref,
  onAction,
}: {
  lot: LotQuality;
  offers: readonly QualityActionOffer[];
  lotHref: (id: string) => string;
  onAction: (lot: LotQuality, action: QualityAction) => void;
}) {
  const status = lot.lot.status;
  // Cerrado por lo que decidió calidad y no por el estado: un clasificado sigue cerrado al pasar a
  // En bodega o a cualquier estado posterior.
  const closed = lot.classification !== null || lot.discard !== null;
  const evaluatedBy = evaluatedByLine(lot);
  const discard = discardLine(lot);
  const closedBy = closedByLine(lot);
  return (
    <li className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="font-mono font-bold break-all">{lot.lot.code}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm text-muted-foreground">
              {farmLabel(lot.farm)}
            </p>
            {closed && <LotStatusBadge status={status} />}
          </div>
        </div>
        {offers.length === 0 && (
          <LotViewLink
            className="-mt-1 -mr-1 shrink-0"
            code={lot.lot.code}
            href={lotHref(lot.lot.id)}
          />
        )}
      </div>
      {status === 'dried' && <p className="text-sm">{dryLine(lot)}</p>}
      {status === 'evaluated' && (
        <QualityFacts facts={evaluationFacts(lot)} label="Evaluación" />
      )}
      {lot.classification && (
        <div className="space-y-2">
          <QualityGradeBar
            label="Reparto del peso seco"
            segments={gradeShares(lot.classification)}
          />
          <QualityFacts
            facts={classificationFacts(lot.classification)}
            label="Clasificación"
          />
        </div>
      )}
      {(discard || closedBy || (evaluatedBy && !closed)) && (
        <div className="space-y-0.5 text-sm">
          {discard && <p className="font-bold">{discard}</p>}
          {evaluatedBy && !closed && (
            <p className="text-muted-foreground">{evaluatedBy}</p>
          )}
          {closedBy && <p className="text-muted-foreground">{closedBy}</p>}
        </div>
      )}
      <QualityCardActions
        lot={lot}
        lotHref={lotHref}
        offers={offers}
        onAction={onAction}
      />
    </li>
  );
}
