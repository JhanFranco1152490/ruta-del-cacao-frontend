import { getErrorMessage, isApiError } from '@/lib/api/errors';

import type { ReportField, ReportFieldErrors } from './report-request';

export const REPORT_FAILED_MESSAGE = 'No fue posible generar el reporte.';

// Los campos del servidor que tienen un filtro en la pantalla. Las dos fechas van juntas: el error
// del periodo se dice debajo de la primera.
const FIELD_OF: Record<string, ReportField> = {
  type: 'type',
  from: 'period',
  to: 'period',
  producer: 'producer',
  municipality: 'municipality',
  farm: 'farm',
  plot: 'plot',
  lot: 'lot',
};

export type ReportErrors = {
  fields: ReportFieldErrors;
  // Lo que no es de un filtro: sin permiso, un reporte demasiado grande, sin red.
  notice: string | null;
};

// Dónde se dice lo que el servidor rechazó: en el filtro que lo causó (un periodo de más de 366
// días, una finca que ya no existe) o, si no es de ninguno, en un aviso de la pantalla, con su
// texto.
export function reportErrors(error: unknown): ReportErrors {
  if (!isApiError(error)) return { fields: {}, notice: REPORT_FAILED_MESSAGE };
  const fields: ReportFieldErrors = {};
  for (const [name, messages] of Object.entries(error.fields ?? {})) {
    const field = FIELD_OF[name];
    if (field && messages[0] && !fields[field]) fields[field] = messages[0];
  }
  if (Object.keys(fields).length > 0) return { fields, notice: null };
  return {
    fields,
    notice: getErrorMessage(error, REPORT_FAILED_MESSAGE),
  };
}
