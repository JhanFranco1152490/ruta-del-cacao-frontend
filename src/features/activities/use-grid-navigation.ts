'use client';

import { type KeyboardEvent, useEffect, useRef, useState } from 'react';

import { weekDates } from '@/lib/format/dates';

import { type GridMove, nextGridDate, nextWeekDate } from './grid-navigation';

// Lo que necesita quien usa el teclado en una cuadrícula o en una semana de días.
export type DayKeyboard = {
  // Pasar al mes o a la semana vecina cuando una flecha se sale del periodo: recibe el día al
  // que iba el foco, que ya es del periodo nuevo.
  onCross?: (date: string) => void;
  // El día que debe recibir el foco cuando llegue su periodo (el de una flecha que cruzó). Se
  // quita con `onFocusHandled` en cuanto lo recibe.
  focusDate?: string;
  onFocusHandled?: () => void;
};

type Roving = DayKeyboard & {
  // Identifica el periodo que se ve: al cambiar, se busca el día que debe recibir el foco.
  period: string;
  defaultStop: string;
  owns: (date: string) => boolean;
  move: (key: string, date: string) => GridMove | null;
  // Enter sobre un día: devuelve si lo atendió.
  onActivate?: (date: string) => boolean;
};

// El teclado de un conjunto de días: una sola parada (hoy, o el primero del periodo) y las
// teclas de movimiento. Quien lo usa pone `register`, `onFocus` y `onKeyDown` en cada celda y
// `tabStop` para saber cuál es la parada.
function useRovingDays({
  period,
  defaultStop,
  owns,
  move,
  onActivate,
  onCross,
  focusDate,
  onFocusHandled,
}: Roving) {
  const cells = useRef(new Map<string, HTMLElement>());
  const [active, setActive] = useState<string | null>(null);
  const tabStop = active && owns(active) ? active : defaultStop;

  // El foco que pidió una flecha que cruzó llega cuando el periodo nuevo ya está en pantalla.
  useEffect(() => {
    if (!focusDate) return;
    const cell = cells.current.get(focusDate);
    if (!cell) return;
    cell.focus();
    onFocusHandled?.();
    // `focusDate` y `period` son lo que dispara la búsqueda; el resto cambia en cada vuelta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusDate, period]);

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
      const target = move(event.key, date);
      if (target) {
        event.preventDefault();
        if (!target.crosses) cells.current.get(target.date)?.focus();
        else onCross?.(target.date);
      } else if (event.key === 'Enter' && onActivate?.(date)) {
        event.preventDefault();
      }
    },
  };
}

// El teclado de la cuadrícula de un mes (yyyy-MM): flechas por día y por semana, Inicio y Fin; al
// salir del mes por una flecha pide pasar al vecino. `onActivate` atiende Enter.
export function useGridNavigation({
  month,
  today,
  onActivate,
  ...keyboard
}: DayKeyboard & {
  month: string;
  today: string;
  onActivate?: (date: string) => boolean;
}) {
  return useRovingDays({
    ...keyboard,
    period: month,
    defaultStop: today.startsWith(month) ? today : `${month}-01`,
    owns: (date) => date.startsWith(month),
    move: (key, date) => nextGridDate(key, date, month),
    onActivate,
  });
}

// El teclado de una semana (su lunes): izquierda y derecha por día, Inicio y Fin, y al pasar el
// lunes o el domingo pide pasar a la semana vecina.
export function useWeekNavigation({
  week,
  today,
  ...keyboard
}: DayKeyboard & { week: string; today: string }) {
  const days = weekDates(week);
  return useRovingDays({
    ...keyboard,
    period: week,
    defaultStop: days.includes(today) ? today : week,
    owns: (date) => days.includes(date),
    move: (key, date) => nextWeekDate(key, date, week),
  });
}
