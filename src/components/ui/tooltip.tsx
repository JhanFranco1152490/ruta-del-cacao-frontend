'use client';

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import { cn } from 'cn';
import type { ReactElement } from 'react';

// Un recuadro pequeño con un dato extra, al pasar el mouse o al enfocar con el teclado, sobre la
// misma librería que los menús y los diálogos. `children` es el elemento que lo dispara: debe poder
// recibir el foco (`tabIndex={0}`) y llevar su propio `aria-label`, porque en un celular no hay
// mouse y el recuadro no es la única forma de leer el dato.
export function Tooltip({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactElement;
  className?: string;
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger render={children} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner className="z-50" sideOffset={8}>
          <TooltipPrimitive.Popup
            className={cn(
              'max-w-64 rounded-md bg-selva px-2.5 py-1.5 text-xs font-semibold text-white shadow-card',
              className,
            )}
          >
            {label}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
