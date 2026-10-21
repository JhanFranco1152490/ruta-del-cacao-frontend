import { cn } from 'cn';
import type { ReactNode } from 'react';

import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

// Las hojas laterales de la app (cuentas, roles) comparten forma: una franja de color arriba con el
// título, el contenido con su propio relleno, secciones en tarjeta y las acciones fijas abajo. La
// hoja se declara sin relleno (`SIDE_PANEL_CLASS`) y la franja del detalle de un registro, que ya
// trae la suya hasta los bordes, usa `data-band` para pintar de blanco el botón de cerrar.
export const SIDE_PANEL_CLASS =
  'gap-0 p-0 sm:max-w-lg has-[[data-band]]:[&_[data-slot=sheet-close]]:text-white has-[[data-band]]:[&_[data-slot=sheet-close]]:hover:bg-white/15 has-[[data-band]]:[&_[data-slot=sheet-close]]:hover:text-white';

// La cabecera de la hoja. Sin `band` queda solo para los lectores de pantalla: el detalle de un
// registro ya tiene su propia franja con el nombre.
export function SidePanelHeader({
  band,
  title,
  description,
}: {
  band: boolean;
  title: string;
  description: string;
}) {
  return (
    <SheetHeader
      className={band ? 'bg-selva px-5 py-4 text-white' : 'sr-only'}
      data-band={band || undefined}
    >
      <SheetTitle className={band ? 'text-white' : undefined}>
        {title}
      </SheetTitle>
      <SheetDescription className={band ? 'text-white/80' : undefined}>
        {description}
      </SheetDescription>
    </SheetHeader>
  );
}

export function SidePanelBody({ children }: { children: ReactNode }) {
  return <div className="px-5 py-4">{children}</div>;
}

export function SidePanelSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'space-y-3 rounded-[var(--radius-card)] border border-border p-4',
        className,
      )}
    >
      <h3 className="section-label">{title}</h3>
      {children}
    </section>
  );
}

// Guardar y cancelar fijos al pie de la hoja, en una fila (Cancelar a la izquierda y la acción
// principal al doble de ancho): el formulario puede ser largo y el botón no se pierde al bajar.
// La acción principal va primero en el código y la fila se invierte para dejarla a la derecha.
export function SidePanelActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-5 -mb-4 flex flex-row-reverse gap-2 border-t border-border bg-popover px-5 py-3 [&>*]:w-auto [&>*]:min-w-0 [&>*]:flex-1 [&>*:first-child]:flex-[2]">
      {children}
    </div>
  );
}
