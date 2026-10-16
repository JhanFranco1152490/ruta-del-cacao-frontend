import { tz } from '@date-fns/tz';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  isValid,
  lastDayOfMonth,
  parseISO,
  startOfWeek,
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

// El día y el mes de una fecha sin hora (yyyy-MM-dd), sin el año: "19 de octubre".
export const formatDayMonth = (isoDate: string) =>
  format(parseISO(isoDate), "d 'de' MMMM", { locale: es });

// El día y el mes abreviado de un momento exacto (ISO con zona), con la hora de Bogotá: "19 oct".
export const formatShortDayMonth = (isoDateTime: string) =>
  format(parseISO(isoDateTime), 'd MMM', { locale: es, in: BOGOTA }).replace(
    '.',
    '',
  );

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

// Un mes escrito como yyyy-MM, como llega en la dirección de una pantalla.
export const isIsoMonth = (value: string) =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

// El mes que queda tantos meses después (o antes, con un número negativo).
export const shiftMonth = (isoMonth: string, months: number) =>
  format(addMonths(parseISO(`${isoMonth}-01`), months), 'yyyy-MM');

// Una fecha sin hora con su día de la semana: "lunes 19 de octubre".
export const formatWeekdayDate = (isoDate: string) =>
  format(parseISO(isoDate), "EEEE d 'de' MMMM", { locale: es });

// La fecha que queda tantos días después de una fecha sin hora (yyyy-MM-dd).
export const shiftDays = (isoDate: string, days: number) =>
  format(addDays(parseISO(isoDate), days), 'yyyy-MM-dd');

// Una fecha sin hora con su día de la semana y su año: "jueves 22 de octubre de 2026".
export const formatWeekdayLongDate = (isoDate: string) =>
  format(parseISO(isoDate), "EEEE d 'de' MMMM 'de' yyyy", { locale: es });

// Una fecha sin hora (yyyy-MM-dd) que existe en el calendario: el 30 de febrero no lo es.
export const isIsoDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value));

// El día de Bogotá (yyyy-MM-dd) en que ocurrió un momento exacto (ISO con zona).
export const dateInBogota = (isoDateTime: string) =>
  format(parseISO(isoDateTime), 'yyyy-MM-dd', { in: BOGOTA });

// El lunes de la semana de una fecha sin hora (la semana va de lunes a domingo).
export const weekStart = (isoDate: string) =>
  format(startOfWeek(parseISO(isoDate), { weekStartsOn: 1 }), 'yyyy-MM-dd');

// Los siete días de la semana que empieza en el lunes dado.
export const weekDates = (monday: string) =>
  Array.from({ length: 7 }, (_, offset) => shiftDays(monday, offset));

export type GridDate = { date: string; inMonth: boolean };

// Las semanas completas, de lunes a domingo, que cubren un mes (yyyy-MM). Los días de los meses
// vecinos que completan la primera y la última semana van marcados como de otro mes.
export function monthGridDates(isoMonth: string): GridDate[][] {
  const { from, to } = monthBounds(isoMonth);
  const first = weekStart(from);
  const weekCount = Math.ceil((daysBetween(first, to) + 1) / 7);
  return Array.from({ length: weekCount }, (_, week) =>
    weekDates(shiftDays(first, week * 7)).map((date) => ({
      date,
      inMonth: date.startsWith(isoMonth),
    })),
  );
}

// El rango de una semana para el título: "12 al 18 de octubre", "28 de septiembre al 4 de octubre"
// o, si cruza el año, con los dos años.
export function formatWeekRange(monday: string) {
  const start = parseISO(monday);
  const end = parseISO(shiftDays(monday, 6));
  if (start.getFullYear() !== end.getFullYear()) {
    return `${format(start, "d 'de' MMMM 'de' yyyy", { locale: es })} al ${format(end, "d 'de' MMMM 'de' yyyy", { locale: es })}`;
  }
  if (start.getMonth() !== end.getMonth()) {
    return `${format(start, "d 'de' MMMM", { locale: es })} al ${format(end, "d 'de' MMMM", { locale: es })}`;
  }
  return `${format(start, 'd')} al ${format(end, "d 'de' MMMM", { locale: es })}`;
}

// Los meses (yyyy-MM) que toca un rango de fechas, del primero al último, ambos incluidos.
export function monthsBetween(fromIsoDate: string, toIsoDate: string) {
  const last = toIsoDate.slice(0, 7);
  const months: string[] = [];
  for (
    let month = fromIsoDate.slice(0, 7);
    month <= last;
    month = shiftMonth(month, 1)
  ) {
    months.push(month);
  }
  return months;
}

// Todos los días de un mes (yyyy-MM), del 1 al último.
export function monthDates(isoMonth: string) {
  const { from, to } = monthBounds(isoMonth);
  return Array.from({ length: daysBetween(from, to) + 1 }, (_, offset) =>
    shiftDays(from, offset),
  );
}

// El día de la semana de una fecha sin hora: 0 es lunes y 6 es domingo.
export const weekdayIndex = (isoDate: string) =>
  daysBetween(weekStart(isoDate), isoDate);
