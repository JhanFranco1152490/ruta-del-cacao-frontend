import { describe, expect, it } from 'vitest';

import { buildProducerIndicators } from '@/test/factories';

import { funnelSteps } from './indicator-funnel';

describe('funnelSteps', () => {
  it('da los cinco pasos del árbol a la venta con sus kilos escritos', () => {
    const steps = funnelSteps(buildProducerIndicators());

    expect(steps.map(({ key, valueLabel }) => [key, valueLabel])).toEqual([
      ['green', '720 kg'],
      ['dry', '166 kg'],
      ['classified', '380 kg'],
      ['stock', '155 kg'],
      ['sold', '210 kg'],
    ]);
  });

  it('lo seco dice qué parte del baba es, y lo clasificado va repartido en calibres', () => {
    const [, dry, classified] = funnelSteps(buildProducerIndicators());

    expect(dry.note).toBe('23 % del baba');
    expect(classified.parts?.map(({ key, kg }) => [key, kg])).toEqual([
      ['g1', 290],
      ['g2', 70],
      ['discard', 20],
    ]);
  });

  it('sin cosecha no calcula un porcentaje', () => {
    const base = buildProducerIndicators();
    const [, dry] = funnelSteps(
      buildProducerIndicators({
        production: { ...base.production, green_kg: '0.0', dry_kg: '0.0' },
      }),
    );

    expect(dry.note).toBe('sin cosecha');
  });
});
