import { describe, expect, it } from 'vitest';

import { buildBuyer } from '@/test/factories';

import { summarizeBuyers } from './buyer-summary';

describe('summarizeBuyers', () => {
  it('counts active and inactive buyers and finds the most frequent type', () => {
    const searched = [
      buildBuyer({ buyer_type: 'intermediary' }),
      buildBuyer({ buyer_type: 'intermediary' }),
      buildBuyer({ buyer_type: 'exporter' }),
      buildBuyer({ buyer_type: 'exporter', is_active: false }),
    ];
    const shown = searched.filter((buyer) => buyer.is_active);

    expect(summarizeBuyers(searched, shown)).toEqual({
      active: 3,
      inactive: 1,
      topType: { type: 'intermediary', count: 2 },
    });
  });

  it('breaks a tie in the order of the user story', () => {
    const shown = [
      buildBuyer({ buyer_type: 'artisan_processor' }),
      buildBuyer({ buyer_type: 'exporter' }),
    ];
    expect(summarizeBuyers(shown, shown).topType).toEqual({
      type: 'exporter',
      count: 1,
    });
  });

  it('has no most frequent type without buyers', () => {
    expect(summarizeBuyers([], [])).toEqual({
      active: 0,
      inactive: 0,
      topType: null,
    });
  });
});
