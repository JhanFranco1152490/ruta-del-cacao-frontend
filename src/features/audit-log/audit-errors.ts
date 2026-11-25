import { getErrorMessage, isApiError } from '@/lib/api/errors';

export const AUDIT_FAILED_MESSAGE = 'No fue posible cargar la bitácora.';

const PERIOD_FIELDS = ['from', 'to'];
// Lo que llega en un enlace guardado y ya no vale: una cuenta de otro productor, un tipo que no
// existe. Se dice debajo de los filtros, donde se corrige.
const FILTER_FIELDS = ['actor', 'record_type'];

export type AuditErrors = {
  period: string | null;
  filter: string | null;
  // Lo que no es de un filtro: sin permiso, un productor que no existe, sin respuesta.
  notice: string | null;
};

const firstOf = (fields: Record<string, string[]>, names: string[]) =>
  names.map((name) => fields[name]?.[0]).find(Boolean) ?? null;

export function auditErrors(error: unknown): AuditErrors {
  if (!isApiError(error)) {
    return { period: null, filter: null, notice: AUDIT_FAILED_MESSAGE };
  }
  const fields = error.fields ?? {};
  const period = firstOf(fields, PERIOD_FIELDS);
  const filter = firstOf(fields, FILTER_FIELDS);
  if (period || filter) return { period, filter, notice: null };
  return {
    period: null,
    filter: null,
    notice: getErrorMessage(error, AUDIT_FAILED_MESSAGE),
  };
}
