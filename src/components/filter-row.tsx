'use client';

import { cn } from 'cn';
import { SlidersHorizontal } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';

import { Button } from '@/components/ui/button';

// Todos los filtros de una lista miden lo mismo (40 px, texto de 14 px), sea un buscador, una lista
// o una fecha: antes cada pantalla los dejaba de 40 o de 44 px. Lo usan también las barras de
// filtros que no son una `FilterRow` (actividades, infraestructura).
export const FILTER_CONTROLS_CLASS = [
  '[&_[data-slot=input-group]]:h-10 [&_[data-slot=input-group-control]]:text-sm',
  '[&_[data-slot=native-select]]:h-10 [&_[data-slot=native-select]]:text-sm',
  '[&_[data-slot=input]]:h-10 [&_[data-slot=input]]:text-sm',
].join(' ');

// La fila de filtros de una lista, sin etiquetas visibles (cada campo dice qué es con su texto). En
// pantallas anchas todo va en la misma fila; en celular queda el buscador y un botón «Filtros»,
// con el número de filtros activos, que abre el resto: así la lista llega antes.
export function FilterRow({
  leading,
  search,
  activeCount = 0,
  more,
  moreActiveCount = 0,
  trailing,
  compact = false,
  children,
}: {
  // Lo que va antes del buscador en pantallas anchas (cómo se agrupa o se ve la lista); en celular
  // pasa al final, tras los filtros.
  leading?: ReactNode;
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
  // Con filtros compactos (40 px), los botones de la fila miden lo mismo.
  compact?: boolean;
  children?: ReactNode;
}) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreId = useId();

  return (
    <div
      className={cn('flex flex-wrap items-start gap-3', FILTER_CONTROLS_CLASS)}
    >
      {leading && (
        <div className="max-sm:order-last max-sm:w-full">{leading}</div>
      )}
      {search}
      {(children || more) && (
        <Button
          aria-controls={panelId}
          aria-expanded={expanded}
          className={cn('sm:hidden', compact && 'h-10')}
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
          className={cn('max-sm:hidden', compact && 'h-10')}
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
