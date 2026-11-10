import { describe, expect, it } from 'vitest';

import { SALE_STATUSES, saleStatusLabel } from './sale-status';

describe('SALE_STATUSES', () => {
  it('names each status with its tone', () => {
    expect(saleStatusLabel('registered')).toBe('Registrada');
    expect(saleStatusLabel('voided')).toBe('Anulada');
    expect(SALE_STATUSES.registered.tone).toBe('ok');
    expect(SALE_STATUSES.voided.tone).toBe('warn');
  });
});
