import { FUTURE_DATE_MESSAGE } from '@/lib/activity-dates';
import { isIsoDate } from '@/lib/format/dates';
import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';

// «La fecha no puede ser anterior al ingreso del lote 000123-…»: el mismo texto que el servidor.
export const beforeEntryMessage = (lotCode: string) =>
  `La fecha no puede ser anterior al ingreso del lote ${lotCode}`;

// Una venta no es futura ni anterior al día en que entró a bodega ninguno de sus lotes: no se vende
// lo que todavía no estaba. Si hay varios, se nombra el último que entró, que es el que manda. Las
// fechas sin hora (yyyy-MM-dd) se comparan como texto.
export function saleDateIssue(
  date: string,
  {
    today,
    lots,
  }: { today: string; lots: readonly { code: string; entryDate: string }[] },
): string | null {
  if (!date.trim() || !isIsoDate(date)) return REQUIRED_FIELD_MESSAGE;
  if (date > today) return FUTURE_DATE_MESSAGE;
  const latest = lots.reduce<{ code: string; entryDate: string } | null>(
    (last, lot) => (!last || lot.entryDate > last.entryDate ? lot : last),
    null,
  );
  if (latest && date < latest.entryDate) return beforeEntryMessage(latest.code);
  return null;
}
