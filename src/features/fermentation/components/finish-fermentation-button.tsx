'use client';

import { FinishProcessButton } from '@/components/finish-process-button';

import type { Fermentation } from '../api';
import { finishBlockedReason } from '../finish-form';
import { pendingTurnsOf, type QueuedTurn } from '../turn-queue';
import { FinishFermentationDialog } from './finish-fermentation-dialog';

// «Finalizar fermentación» con su formulario y, si no se puede, el motivo debajo del botón
// deshabilitado. Lo usan la tarjeta de Fermentación y la ficha del lote.
export function FinishFermentationButton({
  fermentation,
  queued,
  online,
  className,
  inRow,
  autoOpen,
  onAutoOpened,
}: {
  fermentation: Fermentation;
  queued: readonly QueuedTurn[];
  online: boolean;
  className?: string;
  inRow?: boolean;
  autoOpen?: boolean;
  onAutoOpened?: () => void;
}) {
  return (
    <FinishProcessButton
      autoOpen={autoOpen}
      blocked={finishBlockedReason({
        turnCount: fermentation.turns.length,
        queuedCount: pendingTurnsOf(queued, fermentation.lot.id).length,
        online,
      })}
      className={className}
      inRow={inRow}
      label="Finalizar fermentación"
      onAutoOpened={onAutoOpened}
      online={online}
      renderDialog={(dialog) => (
        <FinishFermentationDialog fermentation={fermentation} {...dialog} />
      )}
    />
  );
}
