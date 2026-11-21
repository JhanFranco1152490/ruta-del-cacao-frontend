import type { ReactNode } from 'react';

import { KeyValue, KeyValues } from '@/components/page-blocks/section-card';
import { kilosText } from '@/lib/stock-quantity';

import type { StageOf } from '../../api';
import { HistoryEntry } from './history-entry';

// La cosecha de la que nació el lote. La finca y la parcela ya están en el panel de origen.
export function HarvestStage({
  stage,
  footer,
}: {
  stage: StageOf<'harvest'>;
  footer?: ReactNode;
}) {
  const { harvest } = stage;
  return (
    <HistoryEntry footer={footer} stage={stage}>
      <KeyValues>
        <KeyValue label="Variedad">{harvest.variety}</KeyValue>
        <KeyValue label="Cacao en baba">
          {kilosText(harvest.green_weight_kg)} kg
        </KeyValue>
        <KeyValue label="Recolector">{harvest.collector}</KeyValue>
        <KeyValue label="Ficha de la parcela">
          Versión {harvest.characterization_version}
        </KeyValue>
      </KeyValues>
    </HistoryEntry>
  );
}
