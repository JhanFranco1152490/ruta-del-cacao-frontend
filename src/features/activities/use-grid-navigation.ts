'use client';

import { type KeyboardEvent, useRef, useState } from 'react';

import { nextGridDate } from './grid-navigation';

// El teclado de una cuadrícula de días: una sola parada (hoy, o el primer día del mes) y las
// flechas, Inicio y Fin para moverse. `onActivate` atiende Enter sobre un día y devuelve si lo
// atendió; otras teclas no se tocan. Quien lo usa pone `register`, `onFocus` y `onKeyDown` en cada
// celda y `tabStop` para saber cuál es la parada.
export function useGridNavigation({
  month,
  today,
  onActivate,
}: {
  month: string;
  today: string;
  onActivate?: (date: string) => boolean;
}) {
  const cells = useRef(new Map<string, HTMLElement>());
  const [active, setActive] = useState<string | null>(null);
  const defaultStop = today.startsWith(month) ? today : `${month}-01`;
  const tabStop = active?.startsWith(month) ? active : defaultStop;

  return {
    tabStop,
    register: (date: string) => (element: HTMLElement | null) => {
      if (element) cells.current.set(date, element);
      else cells.current.delete(date);
    },
    onFocus: (date: string) => setActive(date),
    onKeyDown: (event: KeyboardEvent<HTMLElement>, date: string) => {
      // Solo manda la celda; lo que ocurre dentro de una ficha es de la ficha.
      if (event.target !== event.currentTarget) return;
      const target = nextGridDate(event.key, date, month);
      if (target) {
        event.preventDefault();
        setActive(target);
        cells.current.get(target)?.focus();
      } else if (event.key === 'Enter' && onActivate?.(date)) {
        event.preventDefault();
      }
    },
  };
}
