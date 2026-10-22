'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

// El botón de cerrar de un diálogo u hoja. Va pegado arriba mientras el contenido se desplaza, para
// que la salida siempre esté al alcance, y sin ocupar alto: el margen negativo anula el `gap` que le
// toca como primer elemento. Quien lo monta declara el relleno y el `gap` del recuadro en `--pad` y
// `--gap` (por omisión, los de un recuadro con `p-4 gap-4`; una hoja sin relleno los pone en 0). Es
// un botón con fondo: sobre una franja de color y sobre el contenido que pasa por debajo se ve igual.
export function ModalClose({
  slot,
  label,
}: {
  slot: 'dialog-close' | 'sheet-close';
  label: string;
}) {
  return (
    <div className="pointer-events-none sticky top-[var(--pad)] z-20 -mb-[var(--gap)] h-0 self-stretch">
      <DialogPrimitive.Close
        data-slot={slot}
        render={
          <Button
            variant="ghost"
            className="pointer-events-auto absolute top-[calc(0.5rem-var(--pad))] right-[calc(0.5rem-var(--pad))] rounded-full bg-popover text-foreground shadow-sm ring-1 ring-foreground/10 hover:bg-muted"
            size="icon-sm"
          />
        }
      >
        <XIcon aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </DialogPrimitive.Close>
    </div>
  );
}
