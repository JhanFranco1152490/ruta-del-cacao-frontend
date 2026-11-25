import { describe, expect, it } from 'vitest';

import { AUDIT_RECORD_TYPES, isAuditRecordType } from './audit-record-types';

describe('AUDIT_RECORD_TYPES', () => {
  it('lists the seventeen record types the server knows, in its order', () => {
    expect(AUDIT_RECORD_TYPES).toEqual([
      'farm',
      'plot',
      'plot_characterization',
      'input',
      'activity',
      'harvest',
      'lot',
      'facility',
      'fermentation',
      'drying',
      'quality',
      'stock',
      'warehouse',
      'buyer',
      'sale',
      'account',
      'role',
    ]);
  });

  it('tells a known record type from any other text', () => {
    expect(isAuditRecordType('harvest')).toBe(true);
    expect(isAuditRecordType('login')).toBe(false);
  });
});
