import { monthBounds, shiftDays, weekStart } from '@/lib/format/dates';

// A qué día va el foco al pulsar una tecla sobre un día de la cuadrícula de un mes: las flechas
// mueven por día y por semana, Inicio y Fin van a los extremos de la semana, y nunca se sale del
// mes. `null` si la tecla no es de movimiento.
export function nextGridDate(
  key: string,
  date: string,
  month: string,
): string | null {
  const moves: Record<string, string> = {
    ArrowLeft: shiftDays(date, -1),
    ArrowRight: shiftDays(date, 1),
    ArrowUp: shiftDays(date, -7),
    ArrowDown: shiftDays(date, 7),
    Home: weekStart(date),
    End: shiftDays(weekStart(date), 6),
  };
  if (!(key in moves)) return null;
  const { from, to } = monthBounds(month);
  const target = moves[key];
  return target < from ? from : target > to ? to : target;
}
