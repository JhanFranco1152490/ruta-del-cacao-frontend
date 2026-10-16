import { formatLongDate, isIsoDate } from './format/dates';

// Las fechas de una labor: la de realización (de una actividad, del resultado de un monitoreo o de
// un control hecho) y la programada. Las comparten actividades y sanidad; el servidor aplica las
// mismas reglas.

export const FUTURE_DATE_MESSAGE = 'La fecha no puede ser futura';
export const PAST_DATE_MESSAGE = 'La fecha debe ser actual o futura';
export const INVALID_DATE_MESSAGE = 'Escribe una fecha válida.';

// Una labor hecha no puede tener fecha futura ni ser anterior al día desde el que tiene sentido
// (`earliest`: el día en que se programó la actividad, o la fecha del monitoreo que atiende un
// control). `reason` nombra ese día en el mensaje. Las fechas son de Bogotá (yyyy-MM-dd).
export function doneDateIssue(
  doneDate: string,
  today: string,
  earliest: { date: string; reason: string },
): string | null {
  if (!isIsoDate(doneDate)) return INVALID_DATE_MESSAGE;
  if (doneDate > today) return FUTURE_DATE_MESSAGE;
  if (doneDate < earliest.date) {
    return `La fecha no puede ser anterior a ${earliest.reason} (${formatLongDate(earliest.date)})`;
  }
  return null;
}

// Una labor se programa desde hoy.
export function scheduledDateIssue(
  scheduledDate: string,
  today: string,
): string | null {
  if (!isIsoDate(scheduledDate)) return INVALID_DATE_MESSAGE;
  return scheduledDate < today ? PAST_DATE_MESSAGE : null;
}
