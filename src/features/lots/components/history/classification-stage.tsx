import { KeyValue, KeyValues } from '@/components/page-blocks/section-card';
import { kilosText } from '@/lib/stock-quantity';

import type { StageOf } from '../../api';
import {
  gradesText,
  partialDiscardText,
} from '../../history/classification-summary';
import { DiscardNotice } from './discard-notice';
import { HistoryEntry } from './history-entry';

// La clasificación por calibre y, si hubo, el descarte parcial resaltado.
export function ClassificationStage({
  stage,
}: {
  stage: StageOf<'classification'>;
}) {
  const { classification } = stage;
  const discard = partialDiscardText(classification);
  return (
    <HistoryEntry stage={stage}>
      <KeyValues>
        <KeyValue label="Resultado">{gradesText(classification)}</KeyValue>
        <KeyValue label="Peso seco">
          {kilosText(classification.dry_weight_kg)} kg
        </KeyValue>
        <KeyValue label="Clasificó">{classification.classified_by}</KeyValue>
      </KeyValues>
      {discard && <DiscardNotice>{discard}</DiscardNotice>}
    </HistoryEntry>
  );
}
