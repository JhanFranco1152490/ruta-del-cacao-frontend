import { exitReasonText } from '@/lib/exit-reasons';

import type { LotHistoryKind, LotHistoryStage } from '../api';

const TITLES: Record<LotHistoryKind, string> = {
  harvest: 'Cosecha',
  lot_created: 'Lote conformado',
  fermentation: 'Fermentación',
  drying: 'Secado',
  evaluation: 'Evaluación de calidad',
  classification: 'Clasificación',
  discard: 'Lote descartado',
  stock_entry: 'Ingreso a bodega',
  stock_move: 'Cambio de lugar',
  stock_exit: 'Salida de bodega',
  sale: 'Venta',
};

// El título de una entrada de la línea de tiempo. Una salida dice su motivo y una venta su número,
// porque un lote puede tener varias de cada una.
export function stageTitle(stage: LotHistoryStage): string {
  if (stage.kind === 'stock_exit') {
    const { reason, detail } = stage.stock_exit;
    return `${TITLES.stock_exit}: ${exitReasonText(reason, detail)}`;
  }
  if (stage.kind === 'sale') return `${TITLES.sale} ${stage.sale.number}`;
  return TITLES[stage.kind];
}
