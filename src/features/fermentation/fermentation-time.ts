import { formatDecimal } from '@/lib/format/decimal';

// Las horas entre dos momentos con un decimal, la mitad hacia arriba y sin contar las fracciones de
// segundo, como las cuenta el servidor: 2 h 3 min son 2,1 h.
export function hoursBetween(fromIso: string, toIso: string) {
  const seconds = Math.trunc(
    (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 1000,
  );
  return Math.round(seconds / 360) / 10;
}

// «52 h», «48,5 h».
export const hoursText = (hours: string | number) =>
  `${formatDecimal(hours, 1)} h`;

// Una duración larga en días y horas, redondeada a la hora: 122 h son «5 días y 2 h».
export function durationText(hours: string | number) {
  const whole = Math.round(Number(hours));
  const days = Math.floor(whole / 24);
  const rest = whole % 24;
  if (days === 0) return `${whole} h`;
  const daysText = days === 1 ? '1 día' : `${days} días`;
  return rest === 0 ? daysText : `${daysText} y ${rest} h`;
}
