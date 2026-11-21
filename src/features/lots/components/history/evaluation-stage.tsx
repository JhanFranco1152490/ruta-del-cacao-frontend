import { KeyValue, KeyValues } from '@/components/page-blocks/section-card';
import { formatDateTime } from '@/lib/format/dates';
import { formatFixedDecimal } from '@/lib/format/decimal';

import type { StageOf } from '../../api';
import { HistoryEntry } from './history-entry';

const pct = (value: string) => `${formatFixedDecimal(value, 1)} %`;

// La evaluación con sus valores vigentes: si se corrigió, se dice cuándo (el valor anterior es de
// la bitácora de cambios, no de la historia).
export function EvaluationStage({ stage }: { stage: StageOf<'evaluation'> }) {
  const { evaluation } = stage;
  return (
    <HistoryEntry stage={stage}>
      <KeyValues>
        <KeyValue label="Bien fermentados">
          {pct(evaluation.well_fermented_pct)}
        </KeyValue>
        <KeyValue label="Con moho">{pct(evaluation.moldy_pct)}</KeyValue>
        <KeyValue label="Otros defectos">
          {pct(evaluation.other_defects_pct)}
        </KeyValue>
        <KeyValue label="Evaluó">{evaluation.evaluated_by}</KeyValue>
        {evaluation.corrected_at && (
          <KeyValue label="Corregida">
            {formatDateTime(evaluation.corrected_at)}
          </KeyValue>
        )}
      </KeyValues>
    </HistoryEntry>
  );
}
