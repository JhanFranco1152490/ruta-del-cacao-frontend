'use client';

import { cn } from 'cn';
import { type ReactNode, useEffect, useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notify';

// «Finalizar …» con su formulario y, si no se puede, el motivo debajo del botón deshabilitado. Lo
// usan la tarjeta y la ficha del lote de cada proceso de poscosecha; el formulario lo pone quien lo
// monta (`renderDialog`) y el motivo lo decide cada proceso (`blocked`).
export function FinishProcessButton({
  label,
  blocked,
  online,
  className,
  inRow = false,
  autoOpen = false,
  onAutoOpened,
  renderDialog,
}: {
  // El nombre completo del botón: «Finalizar fermentación».
  label: string;
  // Por qué todavía no se puede finalizar; `null` si se puede.
  blocked: string | null;
  online: boolean;
  className?: string;
  // Va en una fila de botones de una tarjeta: el botón dice solo «Finalizar», reparte el ancho con
  // los demás y el motivo, si lo hay, pasa a su propia línea debajo de toda la fila.
  inRow?: boolean;
  // Llegar con el enlace de Lotes abre el formulario. Si no se puede finalizar todavía, solo se ve
  // el motivo bajo el botón.
  autoOpen?: boolean;
  onAutoOpened?: () => void;
  renderDialog: (dialog: {
    onClose: () => void;
    onSaved: (message: string) => void;
  }) => ReactNode;
}) {
  const reasonId = useId();
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
  // Bloqueado por los datos (sin registros, registros sin enviar), no por la conexión: no hay nada
  // que esperar, solo se ve el motivo bajo el botón, y el parámetro sale.
  useEffect(() => {
    if (autoOpen && blocked && online) onAutoOpened?.();
  }, [autoOpen, blocked, online, onAutoOpened]);

  return (
    <div className={cn(inRow && 'contents', className)}>
      <Button
        aria-describedby={blocked ? reasonId : undefined}
        aria-label={inRow ? label : undefined}
        className={inRow ? 'max-sm:flex-1 max-sm:px-3' : 'max-sm:w-full'}
        disabled={!!blocked}
        onClick={() => setManual(true)}
        size="office"
        variant="action"
      >
        {inRow ? 'Finalizar' : label}
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
      {open &&
        renderDialog({
          onClose: close,
          onSaved: (message) => {
            close();
            notify.success(message);
          },
        })}
    </div>
  );
}
