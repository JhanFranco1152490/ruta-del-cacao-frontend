import type { ReactNode } from 'react';

import type { LotHistoryStage } from '../../api';
import { ClassificationStage } from './classification-stage';
import { DiscardStage } from './discard-stage';
import { HistoryPositionContext } from './history-anchor';
import { DryingStage } from './drying-stage';
import { EvaluationStage } from './evaluation-stage';
import { FermentationStage } from './fermentation-stage';
import { HarvestStage } from './harvest-stage';
import { LotCreatedStage } from './lot-created-stage';
import { SaleStage } from './sale-stage';
import { StockEntryStage } from './stock-entry-stage';
import { StockExitStage } from './stock-exit-stage';
import { StockMoveStage } from './stock-move-stage';

// La entrada de cada etapa según su tipo. La cosecha lleva al pie los enlaces a lo que es de la
// parcela (sanidad, actividades) y a la cosecha misma.
export function HistoryStage({
  stage,
  anchorId,
  active,
  harvestFooter,
}: {
  stage: LotHistoryStage;
  anchorId: string;
  active: boolean;
  harvestFooter?: ReactNode;
}) {
  return (
    <HistoryPositionContext.Provider value={{ anchorId, active }}>
      <StageEntry harvestFooter={harvestFooter} stage={stage} />
    </HistoryPositionContext.Provider>
  );
}

function StageEntry({
  stage,
  harvestFooter,
}: {
  stage: LotHistoryStage;
  harvestFooter?: ReactNode;
}) {
  switch (stage.kind) {
    case 'harvest':
      return <HarvestStage footer={harvestFooter} stage={stage} />;
    case 'lot_created':
      return <LotCreatedStage stage={stage} />;
    case 'fermentation':
      return <FermentationStage stage={stage} />;
    case 'drying':
      return <DryingStage stage={stage} />;
    case 'evaluation':
      return <EvaluationStage stage={stage} />;
    case 'classification':
      return <ClassificationStage stage={stage} />;
    case 'discard':
      return <DiscardStage stage={stage} />;
    case 'stock_entry':
      return <StockEntryStage stage={stage} />;
    case 'stock_move':
      return <StockMoveStage stage={stage} />;
    case 'stock_exit':
      return <StockExitStage stage={stage} />;
    case 'sale':
      return <SaleStage stage={stage} />;
  }
}
