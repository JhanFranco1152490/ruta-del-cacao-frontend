import { decimalPattern, decimalText, isDecimal } from './decimal';
import { REQUIRED_FIELD_MESSAGE } from './messages';

export const MAX_PERCENT = 100;
export const PERCENT_MESSAGE = 'Debe estar entre 0 % y 100 %.';
export const ONE_DECIMAL_MESSAGE = 'Usa máximo 1 decimal.';

// Un porcentaje obligatorio de 0 a 100 con un decimal como máximo, escrito con coma o con punto: lo
// mismo que acepta el servidor.
export const percentField = decimalText().superRefine((text, context) => {
  const issue = (message: string) =>
    context.addIssue({ code: 'custom', message });
  if (!text) return issue(REQUIRED_FIELD_MESSAGE);
  if (!isDecimal(text) || Number(text) < 0 || Number(text) > MAX_PERCENT) {
    return issue(PERCENT_MESSAGE);
  }
  if (!decimalPattern(1).test(text)) issue(ONE_DECIMAL_MESSAGE);
});
