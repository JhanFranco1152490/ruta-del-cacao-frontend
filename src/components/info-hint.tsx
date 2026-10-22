'use client';

import { Popover } from '@base-ui/react/popover';
import { Info } from 'lucide-react';
import type { SyntheticEvent } from 'react';

// Dentro de una opción de una lista, tocar el ícono no debe elegir la opción.
const keepInside = (event: SyntheticEvent) => event.stopPropagation();

// Un ícono «i» que explica algo: con el mouse, al ponerlo encima; en una pantalla táctil, al tocarlo
// (y se cierra al tocar fuera). Es para lo que ayuda a entender una opción pero no merece ocupar
// espacio todo el tiempo (la descripción de una plaga). No recibe el foco: quien lo necesite sin
// mouse ni pantalla táctil debe tener el mismo texto en otro sitio (`sr-only` junto al campo).
export function InfoHint({ text }: { text: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-hidden="true"
        closeDelay={100}
        delay={150}
        nativeButton={false}
        onClick={keepInside}
        onMouseUp={keepInside}
        onPointerDown={keepInside}
        onPointerUp={keepInside}
        openOnHover
        render={
          <span className="inline-flex size-6 shrink-0 cursor-help items-center justify-center text-muted-foreground hover:text-selva" />
        }
        tabIndex={-1}
      >
        <Info className="size-4" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className="z-[60]" side="top" sideOffset={8}>
          <Popover.Popup className="max-w-xs rounded-lg bg-popover p-3 text-sm leading-5 text-popover-foreground shadow-md ring-1 ring-foreground/10">
            {text}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
