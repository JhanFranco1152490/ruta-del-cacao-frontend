import { tz } from '@date-fns/tz';
import {
  differenceInCalendarDays,
  format,
  lastDayOfMonth,
  parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';

const BOGOTA = tz('America/Bogota');

// "Hoy" en la zona del negocio: cerca de la medianoche UTC el día de Bogotá aún es el anterior.
export const todayInBogota = () =>
  format(new Date(), 'yyyy-MM-dd', { in: BOGOTA });

// Momento exacto (ISO con zona) mostrado con la hora de Bogotá.
export const formatDateTime = (isoDateTime: string) =>
  format(parseISO(isoDateTime), "d 'de' MMMM 'de' yyyy, h:mm aaaa", {
    locale: es,
    in: BOGOTA,
  });

// Un instante guardado como milisegundos (la fecha de una copia del dispositivo).
export const formatTimestamp = (milliseconds: number) =>
  formatDateTime(new Date(milliseconds).toISOString());

// Recibe una fecha sin hora (yyyy-MM-dd) y no la desplaza por zona horaria.
export const formatLongDate = (isoDate: string) =>
  format(parseISO(isoDate), "d 'de' MMMM 'de' yyyy", { locale: es });

// Un mes y un año (yyyy-MM), sin día: la fecha de una siembra.
export const formatMonthYear = (isoMonth: string) =>
  format(parseISO(`${isoMonth}-01`), "MMMM 'de' yyyy", { locale: es });

// Días de calendario de una fecha sin hora (yyyy-MM-dd) a otra; negativo si la segunda es anterior.
export const daysBetween = (fromIsoDate: string, toIsoDate: string) =>
  differenceInCalendarDays(parseISO(toIsoDate), parseISO(fromIsoDate));

// El primer y el último día de un mes (yyyy-MM), para pedir lo de ese mes completo.
export function monthBounds(isoMonth: string) {
  const from = `${isoMonth}-01`;
  return { from, to: format(lastDayOfMonth(parseISO(from)), 'yyyy-MM-dd') };
}
