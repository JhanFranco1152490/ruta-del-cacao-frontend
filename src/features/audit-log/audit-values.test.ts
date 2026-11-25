import { describe, expect, it } from 'vitest';

import { formatAuditValue } from './audit-values';

describe('formatAuditValue', () => {
  it('keeps the decimals the server sent, with a decimal comma', () => {
    expect(formatAuditValue('125.0', 'number')).toBe('125,0');
    expect(formatAuditValue('1.20', 'number')).toBe('1,20');
    expect(formatAuditValue('4.90', 'number')).toBe('4,90');
  });

  it('writes whole numbers with thousands separators', () => {
    expect(formatAuditValue('18000', 'number')).toBe('18.000');
    expect(formatAuditValue(1800, 'number')).toBe('1800');
  });

  it('leaves a number it cannot read as it came', () => {
    expect(formatAuditValue('sin dato', 'number')).toBe('sin dato');
  });

  it('writes dates and moments with their year, in Bogotá time', () => {
    expect(formatAuditValue('2026-02-03', 'date')).toBe('03/02/2026');
    expect(formatAuditValue('2026-02-03T15:15:00Z', 'datetime')).toBe(
      '03/02/2026 a las 10:15',
    );
  });

  it('writes yes or no', () => {
    expect(formatAuditValue(true, 'bool')).toBe('Sí');
    expect(formatAuditValue(false, 'bool')).toBe('No');
  });

  it('writes text as it came', () => {
    expect(formatAuditValue('CCN-51, 1.800 árboles, 2017', 'text')).toBe(
      'CCN-51, 1.800 árboles, 2017',
    );
  });

  it('has nothing to write without a value', () => {
    expect(formatAuditValue(null, 'text')).toBeNull();
    expect(formatAuditValue('', 'number')).toBeNull();
    expect(formatAuditValue('  ', 'text')).toBeNull();
  });
});
