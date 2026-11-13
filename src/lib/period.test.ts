import { describe, expect, it } from 'vitest';

import { PERIOD_ERROR_MESSAGE, periodError } from './period';

describe('periodError', () => {
  it('flags a period that ends before it starts', () => {
    expect(periodError('2026-11-05', '2026-11-04')).toBe(PERIOD_ERROR_MESSAGE);
  });

  it('accepts a one-day period and a period with a single date', () => {
    expect(periodError('2026-11-05', '2026-11-05')).toBeNull();
    expect(periodError('2026-11-05', null)).toBeNull();
    expect(periodError(null, '2026-11-04')).toBeNull();
  });
});
