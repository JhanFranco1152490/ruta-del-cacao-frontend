import {
  dateInBogota,
  daysBetween,
  formatShortDayMonth,
} from '@/lib/format/dates';

const MINUTE = 60_000;
// Hasta cuántas horas se dice "hace N h"; después del mismo día, "hoy".
const RECENT_HOURS = 6;

// Cuándo llegó: "ahora", "hace 25 min", "hace 2 h", "hoy", "ayer" o "14 oct", con el día de Bogotá.
export function receivedText(createdAt: string, now: Date) {
  const minutes = Math.floor((now.getTime() - Date.parse(createdAt)) / MINUTE);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const days = daysBetween(
    dateInBogota(createdAt),
    dateInBogota(now.toISOString()),
  );
  if (days === 0) return hours < RECENT_HOURS ? `hace ${hours} h` : 'hoy';
  if (days === 1) return 'ayer';
  return formatShortDayMonth(createdAt);
}
