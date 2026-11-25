import { describe, expect, it } from 'vitest';

import { type AuditContentInput, auditContent } from './audit-content';

const input = (
  overrides: Partial<AuditContentInput> = {},
): AuditContentInput => ({
  needsProducer: false,
  periodInvalid: false,
  pending: false,
  notice: null,
  filterError: null,
  total: 3,
  filtered: false,
  ...overrides,
});

describe('auditContent', () => {
  it('shows the list when there are entries', () => {
    expect(auditContent(input())).toBe('list');
  });

  it('asks the technical account for a producer before anything else', () => {
    expect(
      auditContent(input({ needsProducer: true, periodInvalid: true })),
    ).toBe('needs-producer');
  });

  it('waits for a valid period: nothing was asked', () => {
    expect(auditContent(input({ periodInvalid: true, pending: true }))).toBe(
      'invalid-period',
    );
  });

  it('shows the loading block while the first page comes', () => {
    expect(auditContent(input({ pending: true }))).toBe('loading');
  });

  it('shows the error of a rejection that is not of a filter', () => {
    expect(auditContent(input({ notice: 'Sin permiso.' }))).toBe('error');
  });

  it('keeps the list away when a chosen filter was rejected', () => {
    expect(auditContent(input({ filterError: 'La cuenta no existe.' }))).toBe(
      'filter-error',
    );
  });

  it('tells apart an empty log from filters that find nothing', () => {
    expect(auditContent(input({ total: 0 }))).toBe('empty');
    expect(auditContent(input({ total: 0, filtered: true }))).toBe(
      'empty-filtered',
    );
  });
});
