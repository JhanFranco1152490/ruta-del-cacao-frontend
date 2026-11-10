import { dateInBogota, isIsoDate } from '@/lib/format/dates';
import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';

// Los mismos textos que el servidor, para que el error se lea igual venga de donde venga.
export const DATE_IN_FUTURE_MESSAGE = 'La fecha no puede ser futura';
export const ENTRY_BEFORE_CLASSIFICATION_MESSAGE =
  'La fecha no puede ser anterior a la clasificación';
export const EXIT_BEFORE_ENTRY_MESSAGE =
  'La fecha no puede ser anterior al ingreso del lote';

// Las fechas sin hora (yyyy-MM-dd) se comparan como texto: en ese formato el orden alfabético es
// el del calendario.
function dateIssue(
  date: string,
  { today, earliest }: { today: string; earliest: string },
  beforeMessage: string,
): string | null {
  if (!date.trim() || !isIsoDate(date)) return REQUIRED_FIELD_MESSAGE;
  if (date > today) return DATE_IN_FUTURE_MESSAGE;
  if (date < earliest) return beforeMessage;
  return null;
}

// El ingreso no es futuro ni anterior al día (en Bogotá) en que se clasificó el lote.
export const entryDateIssue = (
  date: string,
  { today, classifiedAt }: { today: string; classifiedAt: string },
) =>
  dateIssue(
    date,
    { today, earliest: dateInBogota(classifiedAt) },
    ENTRY_BEFORE_CLASSIFICATION_MESSAGE,
  );

// Una salida no es futura ni anterior al ingreso: el cacao no podía salir antes de estar.
export const exitDateIssue = (
  date: string,
  { today, enteredOn }: { today: string; enteredOn: string },
) => dateIssue(date, { today, earliest: enteredOn }, EXIT_BEFORE_ENTRY_MESSAGE);
