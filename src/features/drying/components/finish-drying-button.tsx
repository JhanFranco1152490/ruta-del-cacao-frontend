'use client';

import { FinishProcessButton } from '@/components/finish-process-button';

import type { Drying } from '../api';
import { finishBlockedReason } from '../finish-form';
import { pendingLogsOf, type QueuedLog } from '../log-queue';
import { FinishDryingDialog } from './finish-drying-dialog';

// «Finalizar secado» con su formulario y, si no se puede, el motivo debajo del botón deshabilitado.
// Lo usan la tarjeta de Secado y la ficha del lote.
export function FinishDryingButton({
  drying,
  queued,
  online,
  className,
  inRow,
  autoOpen,
  onAutoOpened,
}: {
  drying: Drying;
  queued: readonly QueuedLog[];
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
        logCount: drying.logs.length,
        queuedCount: pendingLogsOf(queued, drying.lot.id).length,
        online,
      })}
      className={className}
      inRow={inRow}
      label="Finalizar secado"
      onAutoOpened={onAutoOpened}
      online={online}
      renderDialog={(dialog) => (
        <FinishDryingDialog drying={drying} {...dialog} />
      )}
    />
  );
}
