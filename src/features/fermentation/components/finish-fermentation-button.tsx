'use client';

import { cn } from 'cn';
import { useEffect, useId, useState } from 'react';

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
  autoOpen = false,
  onAutoOpened,
}: {
  fermentation: Fermentation;
  queued: readonly QueuedTurn[];
  online: boolean;
  className?: string;
  // Va en una fila de botones de una tarjeta: el botón dice solo «Finalizar», reparte el ancho con
  // los demás y el motivo, si lo hay, pasa a su propia línea debajo de toda la fila.
  inRow?: boolean;
  // Llegar con el enlace de Lotes abre el formulario. Si no se puede finalizar todavía, solo se ve
  // el motivo bajo el botón.
  autoOpen?: boolean;
  onAutoOpened?: () => void;
}) {
  const reasonId = useId();
  const blocked = finishBlockedReason({
    turnCount: fermentation.turns.length,
    queuedCount: pendingTurnsOf(queued, fermentation.lot.id).length,
    online,
  });
  // El formulario se abre con el botón o, si se llegó con el enlace de Lotes, en cuanto se puede
  // finalizar: el navegador tarda un instante en confirmar que hay conexión, y hasta entonces el
  // botón está bloqueado. Al cerrarlo, el parámetro sale de la dirección para que recargar no lo
  // vuelva a abrir.
  const [manual, setManual] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const open = manual || (autoOpen && !blocked && !dismissed);
  const close = () => {
    setManual(false);
    setDismissed(true);
    onAutoOpened?.();
  };
  // Bloqueado por los datos (sin volteos, volteos sin enviar), no por la conexión: no hay nada que
  // esperar, solo se ve el motivo bajo el botón, y el parámetro sale.
  useEffect(() => {
    if (autoOpen && blocked && online) onAutoOpened?.();
  }, [autoOpen, blocked, online, onAutoOpened]);

  return (
    <div className={cn(inRow && 'contents', className)}>
      <Button
        aria-describedby={blocked ? reasonId : undefined}
        aria-label={inRow ? 'Finalizar fermentación' : undefined}
        className={inRow ? 'max-sm:flex-1 max-sm:px-3' : 'max-sm:w-full'}
        disabled={!!blocked}
        onClick={() => setManual(true)}
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
          onClose={close}
          onSaved={(message) => {
            close();
            notify.success(message);
          }}
        />
      )}
    </div>
  );
}
