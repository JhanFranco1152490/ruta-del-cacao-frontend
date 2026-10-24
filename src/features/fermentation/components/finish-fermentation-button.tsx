'use client';

import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notify';

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
}: {
  fermentation: Fermentation;
  queued: readonly QueuedTurn[];
  online: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const reasonId = useId();
  const blocked = finishBlockedReason({
    turnCount: fermentation.turns.length,
    queuedCount: pendingTurnsOf(queued, fermentation.lot.id).length,
    online,
  });

  return (
    <div className={className}>
      <Button
        aria-describedby={blocked ? reasonId : undefined}
        className="max-sm:w-full"
        disabled={!!blocked}
        onClick={() => setOpen(true)}
        size="office"
        variant="action"
      >
        Finalizar fermentación
      </Button>
      {blocked && (
        <p className="mt-1 text-sm font-bold text-warn" id={reasonId}>
          {blocked}
        </p>
      )}
      {open && (
        <FinishFermentationDialog
          fermentation={fermentation}
          onClose={() => setOpen(false)}
          onSaved={(message) => {
            setOpen(false);
            notify.success(message);
          }}
        />
      )}
    </div>
  );
}
