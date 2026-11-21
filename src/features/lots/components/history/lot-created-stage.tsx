import { KeyValue, KeyValues } from '@/components/page-blocks/section-card';

import type { StageOf } from '../../api';
import { HistoryEntry } from './history-entry';

export function LotCreatedStage({ stage }: { stage: StageOf<'lot_created'> }) {
  return (
    <HistoryEntry stage={stage}>
      <KeyValues>
        <KeyValue label="Conformó">
          {stage.lot_created.created_by ?? 'Una cuenta eliminada'}
        </KeyValue>
      </KeyValues>
    </HistoryEntry>
  );
}
