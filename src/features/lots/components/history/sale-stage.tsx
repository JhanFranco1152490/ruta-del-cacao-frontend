import { cn } from 'cn';

import { KeyValue, KeyValues } from '@/components/page-blocks/section-card';
import { GRADE_LABELS, kilosText } from '@/lib/stock-quantity';

import type { StageOf } from '../../api';
import { voidedText } from '../../history/voided';
import { HistoryEntry } from './history-entry';
import { VoidedBadge, VoidedLine } from './voided-mark';

// Una venta con los kilos de este lote, sin precios: esos son de Ventas, con su permiso.
export function SaleStage({ stage }: { stage: StageOf<'sale'> }) {
  const { sale } = stage;
  const voided = voidedText(sale);
  return (
    <HistoryEntry badge={voided && <VoidedBadge />} stage={stage}>
      <KeyValues>
        <KeyValue label="Comprador">{sale.buyer}</KeyValue>
        {sale.lines.map((line) => (
          <KeyValue key={line.grade} label={GRADE_LABELS[line.grade]}>
            <span
              className={cn(voided && 'text-muted-foreground line-through')}
            >
              {kilosText(line.quantity_kg)} kg
            </span>
          </KeyValue>
        ))}
      </KeyValues>
      {voided && <VoidedLine>{voided}</VoidedLine>}
    </HistoryEntry>
  );
}
