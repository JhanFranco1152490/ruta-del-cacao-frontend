import { dateInBogota, daysBetween } from '@/lib/format/dates';

// El día de secado de un momento: el día 1 es la fecha del inicio (en la hora de Bogotá), aunque
// haya empezado a media tarde. Se cuenta por fecha, así que un día sin bitácora sigue contando.
export const dayNumberOf = (startedAt: string, moment: string | Date) =>
  daysBetween(
    dateInBogota(startedAt),
    dateInBogota(new Date(moment).toISOString()),
  ) + 1;
