import { farmLabel } from '@/lib/format/place-label';
import type { QualityAction } from '@/lib/paths/quality';

import { LotStatusBadge } from '@/components/lot-status-badge';

import type { LotQuality } from '../api';
import {
  classificationFacts,
  discardLine,
  dryLine,
  evaluatedByLine,
  evaluationFacts,
} from '../quality-card-facts';
import type { QualityActionOffer } from '../quality-actions';
import { QualityCardActions } from './quality-card-actions';
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
  const closed = status === 'classified' || status === 'discarded';
  const evaluatedBy = evaluatedByLine(lot);
  const discard = discardLine(lot);
  return (
    <li className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-card p-4 shadow-card">
      <div className="min-w-0 space-y-0.5">
        <p className="font-mono font-bold break-all">{lot.lot.code}</p>
        <p className="text-sm text-muted-foreground">{farmLabel(lot.farm)}</p>
      </div>
      {closed && (
        <div>
          <LotStatusBadge status={status} />
        </div>
      )}
      {status === 'dried' && <p className="text-sm">{dryLine(lot)}</p>}
      {status === 'evaluated' && (
        <QualityFacts facts={evaluationFacts(lot)} label="Evaluación" />
      )}
      {lot.classification && (
        <QualityFacts
          facts={classificationFacts(lot.classification)}
          label="Clasificación"
        />
      )}
      {(discard || (evaluatedBy && !closed)) && (
        <div className="space-y-0.5 text-sm">
          {discard && <p className="font-bold">{discard}</p>}
          {evaluatedBy && !closed && (
            <p className="text-muted-foreground">{evaluatedBy}</p>
          )}
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
