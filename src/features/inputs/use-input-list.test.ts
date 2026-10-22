import { describe, expect, it } from 'vitest';

import { resolveStockFarm } from './use-input-list';

const choices = [
  { id: 'f1', name: 'La Loma', is_active: true },
  { id: 'f2', name: 'El Alto', is_active: true },
];

describe('resolveStockFarm', () => {
  it('always shows the only farm of who works on one', () => {
    expect(
      resolveStockFarm({
        onlyFarmId: 'f9',
        needsProducer: false,
        choices,
        requested: 'f1',
      }),
    ).toBe('f9');
  });

  it('shows the total while the technical account has not chosen a producer', () => {
    expect(
      resolveStockFarm({
        onlyFarmId: null,
        needsProducer: true,
        choices: undefined,
        requested: 'f1',
      }),
    ).toBe(null);
  });

  it('keeps the farm of the address only when it is one of the producer', () => {
    const base = { onlyFarmId: null, needsProducer: false, choices };
    expect(resolveStockFarm({ ...base, requested: 'f2' })).toBe('f2');
    expect(resolveStockFarm({ ...base, requested: 'otra' })).toBe(null);
  });

  it('trusts the address while the farms are still loading', () => {
    expect(
      resolveStockFarm({
        onlyFarmId: null,
        needsProducer: false,
        choices: undefined,
        requested: 'f1',
      }),
    ).toBe('f1');
  });
});
