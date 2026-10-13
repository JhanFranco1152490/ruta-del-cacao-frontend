import {
  monthBounds,
  shiftDays,
  weekDates,
  weekStart,
} from '@/lib/format/dates';

export type GridMove = {
  date: string;
  // El día queda fuera del periodo que se ve: hay que pasar al anterior o al siguiente.
  crosses: boolean;
};

// A qué día va el foco al pulsar una tecla sobre un día de la cuadrícula de un mes: las flechas
// mueven por día y por semana y, si se salen del mes, piden pasar al vecino (`crosses`); Inicio y
// Fin van a los extremos de la semana sin salirse del mes. `null` si la tecla no es de movimiento.
export function nextGridDate(
  key: string,
  date: string,
  month: string,
): GridMove | null {
  const { from, to } = monthBounds(month);
  const clamp = (value: string) =>
    value < from ? from : value > to ? to : value;
  const arrows: Record<string, string> = {
    ArrowLeft: shiftDays(date, -1),
    ArrowRight: shiftDays(date, 1),
    ArrowUp: shiftDays(date, -7),
    ArrowDown: shiftDays(date, 7),
  };
  if (key in arrows) {
    const target = arrows[key];
    return { date: target, crosses: !target.startsWith(month) };
  }
  if (key === 'Home') return { date: clamp(weekStart(date)), crosses: false };
  if (key === 'End') {
    return { date: clamp(shiftDays(weekStart(date), 6)), crosses: false };
  }
  return null;
}

// Lo mismo en una semana (su lunes): izquierda y derecha mueven por día y, pasado el lunes o el
// domingo, piden pasar a la semana vecina; Inicio y Fin van al lunes y al domingo.
export function nextWeekDate(
  key: string,
  date: string,
  week: string,
): GridMove | null {
  const days = weekDates(week);
  if (key === 'Home') return { date: days[0], crosses: false };
  if (key === 'End') return { date: days[6], crosses: false };
  if (key !== 'ArrowLeft' && key !== 'ArrowRight') return null;
  const target = shiftDays(date, key === 'ArrowLeft' ? -1 : 1);
  return { date: target, crosses: !days.includes(target) };
}
