import { KeyValue, KeyValues } from '@/components/page-blocks/section-card';
import { formatDateTime } from '@/lib/format/dates';
import { kilosText } from '@/lib/stock-quantity';

import type { StageOf } from '../../api';
import { HistoryEntry } from './history-entry';
import { placeText } from '../../history/place-text';

export function StockEntryStage({ stage }: { stage: StageOf<'stock_entry'> }) {
  const entry = stage.stock_entry;
  return (
    <HistoryEntry stage={stage}>
      <KeyValues>
        <KeyValue label="Bodega">
          {placeText(entry.warehouse, entry.location)}
        </KeyValue>
        <KeyValue label="Ingresó">{entry.entered_by}</KeyValue>
        <KeyValue label="G1">{kilosText(entry.g1_kg)} kg</KeyValue>
        <KeyValue label="G2">{kilosText(entry.g2_kg)} kg</KeyValue>
        {entry.corrected_at && (
          <KeyValue label="Corregido">
            {formatDateTime(entry.corrected_at)}
          </KeyValue>
        )}
      </KeyValues>
    </HistoryEntry>
  );
}
