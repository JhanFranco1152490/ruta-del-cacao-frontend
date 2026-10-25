'use client';

import { cn } from 'cn';
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
  inRow = false,
}: {
  fermentation: Fermentation;
  queued: readonly QueuedTurn[];
  online: boolean;
  className?: string;
  // Va en una fila de botones de una tarjeta: el botón dice solo «Finalizar», reparte el ancho con
  // los demás y el motivo, si lo hay, pasa a su propia línea debajo de toda la fila.
  inRow?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const reasonId = useId();
  const blocked = finishBlockedReason({
    turnCount: fermentation.turns.length,
    queuedCount: pendingTurnsOf(queued, fermentation.lot.id).length,
    online,
  });

  return (
    <div className={cn(inRow && 'contents', className)}>
      <Button
        aria-describedby={blocked ? reasonId : undefined}
        aria-label={inRow ? 'Finalizar fermentación' : undefined}
        className={inRow ? 'max-sm:flex-1 max-sm:px-3' : 'max-sm:w-full'}
        disabled={!!blocked}
        onClick={() => setOpen(true)}
        size="office"
        variant="action"
      >
        {inRow ? 'Finalizar' : 'Finalizar fermentación'}
      </Button>
      {blocked && (
        <p
          className={cn(
            'mt-1 text-sm font-bold text-warn',
            inRow && 'order-last basis-full',
          )}
          id={reasonId}
        >
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
