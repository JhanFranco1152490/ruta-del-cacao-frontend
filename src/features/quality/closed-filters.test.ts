import { describe, expect, it } from 'vitest';

import {
  effectiveClosedFilters,
  hasClosedFilters,
  PERIOD_ERROR_MESSAGE,
  periodError,
} from './closed-filters';

describe('closed filters', () => {
  it('flags a period that ends before it starts', () => {
    expect(periodError('2026-11-05', '2026-11-04')).toBe(PERIOD_ERROR_MESSAGE);
    expect(periodError('2026-11-05', '2026-11-05')).toBeNull();
    expect(periodError('2026-11-05', null)).toBeNull();
    expect(periodError(null, '2026-11-04')).toBeNull();
  });

  it('drops a reversed period but keeps the result', () => {
    expect(
      effectiveClosedFilters({
        result: 'discarded',
        from: '2026-11-05',
        to: '2026-11-04',
      }),
    ).toEqual({ result: 'discarded', from: null, to: null });
  });

  it('keeps a valid period as it is', () => {
    const closed = { result: null, from: '2026-11-01', to: '2026-11-30' };

    expect(effectiveClosedFilters(closed)).toBe(closed);
  });

  it('says whether any closed filter is set', () => {
    expect(hasClosedFilters({ result: null, from: null, to: null })).toBe(
      false,
    );
    expect(
      hasClosedFilters({ result: 'classified', from: null, to: null }),
    ).toBe(true);
    expect(
      hasClosedFilters({ result: null, from: '2026-11-01', to: null }),
    ).toBe(true);
  });
});
