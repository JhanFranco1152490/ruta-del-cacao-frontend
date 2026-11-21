import { KeyValue, KeyValues } from '@/components/page-blocks/section-card';

import type { StageOf } from '../../api';
import { HistoryEntry } from './history-entry';
import { placeText } from '../../history/place-text';

export function StockMoveStage({ stage }: { stage: StageOf<'stock_move'> }) {
  const move = stage.stock_move;
  return (
    <HistoryEntry stage={stage}>
      <KeyValues>
        <KeyValue label="De">
          {placeText(move.from_warehouse, move.from_location)}
        </KeyValue>
        <KeyValue label="A">
          {placeText(move.to_warehouse, move.to_location)}
        </KeyValue>
        <KeyValue label="Movió">{move.moved_by}</KeyValue>
      </KeyValues>
    </HistoryEntry>
  );
}
