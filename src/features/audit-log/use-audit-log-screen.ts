'use client';

import { useSession } from '@/hooks/use-session';
import { useProducerSummary } from '@/lib/api/producer-options';

import { auditContent } from './audit-content';
import { type AuditErrors, auditErrors } from './audit-errors';
import { actorOptions } from './audit-filter-options';
import { auditQuery, validateAuditFilters } from './audit-request';
import { useAuditLog, useAuditOptions } from './queries';
import { useAuditFilters } from './use-audit-filters';

export type AuditLogScreenState = ReturnType<typeof useAuditLogScreen>;

const NO_ERRORS: AuditErrors = { period: null, filter: null, notice: null };

// Todo lo que la Bitácora lee y decide antes de dibujarse. Nada se pide hasta saber quién mira: la
// cuenta técnica sin productor elegido recibiría un 400, y con el periodo al revés no se pregunta.
export function useAuditLogScreen() {
  const { data: user, isPending: sessionPending } = useSession();
  const filters = useAuditFilters();
  const superuser = user?.is_superuser === true;
  const needsProducer = superuser && !filters.values.producer;
  const ready = !!user && !needsProducer;
  const invalid = validateAuditFilters(filters.values);
  const query = auditQuery(filters.values, { superuser });

  const log = useAuditLog(query, ready && !invalid);
  const options = useAuditOptions(query.producer, ready);
  const refused = log.error ? auditErrors(log.error) : NO_ERRORS;

  return {
    filters,
    superuser,
    selectedProducer: useProducerSummary(
      superuser ? (filters.values.producer ?? undefined) : undefined,
    ),
    actorOptions: actorOptions(options.data?.actors ?? []),
    recordTypes: options.data?.record_types ?? [],
    periodError: invalid?.period ?? refused.period,
    filterError: refused.filter,
    notice: refused.notice,
    log,
    content: auditContent({
      needsProducer,
      periodInvalid: !!invalid,
      pending: sessionPending || log.isPending,
      notice: refused.notice,
      filterError: refused.filter,
      total: log.data?.count ?? 0,
      filtered: filters.hasFilters,
    }),
  };
}
