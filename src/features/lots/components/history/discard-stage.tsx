import { KeyValue, KeyValues } from '@/components/page-blocks/section-card';

import type { StageOf } from '../../api';
import { fullDiscardText } from '../../history/classification-summary';
import { DiscardNotice } from './discard-notice';
import { HistoryEntry } from './history-entry';

// El lote descartado completo: la historia termina aquí, con el motivo y los kilos.
export function DiscardStage({ stage }: { stage: StageOf<'discard'> }) {
  return (
    <HistoryEntry stage={stage} tone="err">
      <DiscardNotice>{fullDiscardText(stage.discard)}</DiscardNotice>
      <KeyValues>
        <KeyValue label="Descartó">{stage.discard.discarded_by}</KeyValue>
      </KeyValues>
    </HistoryEntry>
  );
}
