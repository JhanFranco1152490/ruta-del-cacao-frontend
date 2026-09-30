import { tz } from '@date-fns/tz';
import { format, parseISO } from 'date-fns';
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

// Recibe una fecha sin hora (yyyy-MM-dd) y no la desplaza por zona horaria.
export const formatLongDate = (isoDate: string) =>
  format(parseISO(isoDate), "d 'de' MMMM 'de' yyyy", { locale: es });
