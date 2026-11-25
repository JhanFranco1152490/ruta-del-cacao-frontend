import type { AuditLogFilters } from '@/lib/api/query-keys';
import { periodError } from '@/lib/period';

export const AUDIT_PAGE_SIZE = 20;

// Lo que hay en los filtros de la pantalla. Todo es opcional: sin nada, la bitácora completa.
export type AuditFilterValues = AuditLogFilters;

export type AuditFieldErrors = { period: string };

// El periodo al revés se dice en el campo y no se pregunta al servidor, que valida lo mismo.
export function validateAuditFilters(
  values: AuditFilterValues,
): AuditFieldErrors | null {
  const period = periodError(values.from, values.to);
  return period ? { period } : null;
}

// Lo que se pide al servidor. El productor lo manda solo la cuenta técnica: para las demás el
// servidor lo ignora, y así la consulta en caché no depende de un valor que no cuenta.
export const auditQuery = (
  values: AuditFilterValues,
  { superuser }: { superuser: boolean },
): AuditLogFilters => ({
  ...values,
  producer: superuser ? values.producer : null,
});

// Los parámetros con los nombres que lee el servidor; los vacíos los quita `apiPath`.
export const auditSearchParams = (filters: AuditLogFilters) => ({
  producer: filters.producer,
  actor: filters.actor,
  record_type: filters.recordType,
  from: filters.from,
  to: filters.to,
  page: filters.page,
  page_size: AUDIT_PAGE_SIZE,
});

// Si hay algo que «Limpiar filtros» quitaría. El productor de la cuenta técnica no cuenta: es a
// quién se mira, no un filtro de lo que se mira.
export const hasAuditFilters = (values: AuditFilterValues) =>
  Boolean(values.actor || values.recordType || values.from || values.to);
