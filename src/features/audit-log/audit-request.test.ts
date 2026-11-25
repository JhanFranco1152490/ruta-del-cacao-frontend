import { describe, expect, it } from 'vitest';

import { PERIOD_ERROR_MESSAGE } from '@/lib/period';

import {
  AUDIT_PAGE_SIZE,
  type AuditFilterValues,
  auditQuery,
  auditSearchParams,
  hasAuditFilters,
  validateAuditFilters,
} from './audit-request';

const values = (
  overrides: Partial<AuditFilterValues> = {},
): AuditFilterValues => ({
  producer: null,
  actor: null,
  recordType: null,
  from: null,
  to: null,
  page: 1,
  ...overrides,
});

describe('validateAuditFilters', () => {
  it('accepts no filters at all: the whole log', () => {
    expect(validateAuditFilters(values())).toBeNull();
  });

  it('accepts a period with only one of its dates', () => {
    expect(validateAuditFilters(values({ from: '2026-11-01' }))).toBeNull();
    expect(validateAuditFilters(values({ to: '2026-11-01' }))).toBeNull();
  });

  it('rejects an end date before the start date', () => {
    expect(
      validateAuditFilters(values({ from: '2026-11-20', to: '2026-11-01' })),
    ).toEqual({ period: PERIOD_ERROR_MESSAGE });
  });

  it('accepts a single day', () => {
    expect(
      validateAuditFilters(values({ from: '2026-11-20', to: '2026-11-20' })),
    ).toBeNull();
  });
});

describe('auditQuery', () => {
  it('sends the producer only for the technical account', () => {
    const chosen = values({ producer: 'pr-1', actor: 'acc-2' });

    expect(auditQuery(chosen, { superuser: true }).producer).toBe('pr-1');
    expect(auditQuery(chosen, { superuser: false })).toEqual({
      producer: null,
      actor: 'acc-2',
      recordType: null,
      from: null,
      to: null,
      page: 1,
    });
  });
});

describe('auditSearchParams', () => {
  it('names each filter the way the server reads it, with the page size', () => {
    expect(
      auditSearchParams({
        producer: 'pr-1',
        actor: 'acc-2',
        recordType: 'harvest',
        from: '2026-11-01',
        to: '2026-11-20',
        page: 3,
      }),
    ).toEqual({
      producer: 'pr-1',
      actor: 'acc-2',
      record_type: 'harvest',
      from: '2026-11-01',
      to: '2026-11-20',
      page: 3,
      page_size: AUDIT_PAGE_SIZE,
    });
    expect(AUDIT_PAGE_SIZE).toBe(20);
  });
});

describe('hasAuditFilters', () => {
  it('counts the user, the record type and either date', () => {
    expect(hasAuditFilters(values())).toBe(false);
    expect(hasAuditFilters(values({ actor: 'acc-2' }))).toBe(true);
    expect(hasAuditFilters(values({ recordType: 'sale' }))).toBe(true);
    expect(hasAuditFilters(values({ to: '2026-11-20' }))).toBe(true);
  });

  // El productor de la cuenta técnica y la página no son filtros: «Limpiar filtros» no los quita.
  it('does not count the producer or the page', () => {
    expect(hasAuditFilters(values({ producer: 'pr-1', page: 4 }))).toBe(false);
  });
});
