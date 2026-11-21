import { cn } from 'cn';

import { KeyValue, KeyValues } from '@/components/page-blocks/section-card';
import { GRADE_LABELS, kilosText } from '@/lib/stock-quantity';

import type { StageOf } from '../../api';
import { voidedText } from '../../history/voided';
import { HistoryEntry } from './history-entry';
import { VoidedBadge, VoidedLine } from './voided-mark';

// Una salida de bodega que no es una venta (esas las cuenta su venta). Anulada, sigue aquí con sus
// kilos tachados.
export function StockExitStage({ stage }: { stage: StageOf<'stock_exit'> }) {
  const exit = stage.stock_exit;
  const voided = voidedText(exit);
  return (
    <HistoryEntry badge={voided && <VoidedBadge />} stage={stage}>
      <KeyValues>
        <KeyValue label={GRADE_LABELS[exit.grade]}>
          <span className={cn(voided && 'text-muted-foreground line-through')}>
            {kilosText(exit.quantity_kg)} kg
          </span>
        </KeyValue>
        <KeyValue label="Registró">{exit.created_by}</KeyValue>
      </KeyValues>
      {voided && <VoidedLine>{voided}</VoidedLine>}
    </HistoryEntry>
  );
}
