import { describe, expect, it } from 'vitest';

import { buildSaleSummary } from '@/test/factories';

import { saleSummaryFigures } from './sale-summary';

describe('saleSummaryFigures', () => {
  it('writes the value in pesos and the kilos with one decimal', () => {
    expect(saleSummaryFigures(buildSaleSummary())).toEqual({
      total: '$ 3.375.000',
      g1Kg: '150,0',
      g2Kg: '40,0',
      sales: '1',
    });
  });

  it('shows zeros for a month without sales', () => {
    expect(
      saleSummaryFigures({ total: 0, g1_kg: '0.0', g2_kg: '0.0', sales: 0 }),
    ).toEqual({ total: '$ 0', g1Kg: '0,0', g2Kg: '0,0', sales: '0' });
  });
});
