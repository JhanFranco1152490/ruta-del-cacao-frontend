'use client';

import { cn } from 'cn';
import { SlidersHorizontal } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';

import { Button } from '@/components/ui/button';

// La fila de filtros de una lista, sin etiquetas visibles (cada campo dice qué es con su texto). En
// pantallas anchas todo va en la misma fila; en celular queda el buscador y un botón «Filtros»,
// con el número de filtros activos, que abre el resto: así la lista llega antes.
export function FilterRow({
  search,
  activeCount = 0,
  more,
  moreActiveCount = 0,
  trailing,
  children,
}: {
  // El buscador, que se ve siempre.
  search: ReactNode;
  // Cuántos de los filtros de `children` están puestos, para el botón de celular.
  activeCount?: number;
  // Filtros de uso poco frecuente: en pantallas anchas quedan tras «Más filtros», para que la fila
  // no se parta en dos; en celular van con el resto, tras «Filtros».
  more?: ReactNode;
  // Cuántos de los filtros de `more` están puestos, para el botón «Más filtros».
  moreActiveCount?: number;
  // Lo que va al final de la fila en pantallas anchas (un recuento, un cambio de vista).
  trailing?: ReactNode;
  children?: ReactNode;
}) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreId = useId();

  return (
    <div className="flex flex-wrap items-start gap-3">
      {search}
      {(children || more) && (
        <Button
          aria-controls={panelId}
          aria-expanded={expanded}
          className="sm:hidden"
          onClick={() => setExpanded((value) => !value)}
          size="office"
          type="button"
          variant="outline"
        >
          <SlidersHorizontal aria-hidden="true" className="size-4" /> Filtros
          {activeCount > 0 && (
            <span className="rounded-full bg-selva px-2 text-xs text-white">
              {activeCount}
            </span>
          )}
        </Button>
      )}
      {/* En escritorio los filtros van en la misma fila (`contents`); en celular, bajo el botón. */}
      {children && (
        <div
          className={cn(
            'w-full flex-col gap-3 sm:contents',
            expanded ? 'flex' : 'hidden',
          )}
          id={panelId}
        >
          {children}
        </div>
      )}
      {more && (
        <Button
          aria-controls={moreId}
          aria-expanded={moreOpen}
          className="max-sm:hidden"
          onClick={() => setMoreOpen((value) => !value)}
          size="office"
          type="button"
          variant="outline"
        >
          <SlidersHorizontal aria-hidden="true" className="size-4" /> Más
          filtros
          {moreActiveCount > 0 && (
            <span className="rounded-full bg-selva px-2 text-xs text-white">
              {moreActiveCount}
            </span>
          )}
        </Button>
      )}
      {trailing}
      {more && (
        <div
          className={cn(
            'w-full flex-col gap-3 sm:flex-row sm:flex-wrap',
            expanded ? 'flex' : 'hidden',
            moreOpen ? 'sm:flex' : 'sm:hidden',
          )}
          id={moreId}
        >
          {more}
        </div>
      )}
    </div>
  );
}
