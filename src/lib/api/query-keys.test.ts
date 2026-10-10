import { describe, expect, it } from 'vitest';

import { queryKeys } from './query-keys';

// Invalidar una clave invalida todas las que empiezan igual: tras guardar un insumo se invalida
// `all()`, y eso tiene que alcanzar el catálogo de cualquier productor.
const startsWith = (key: readonly unknown[], prefix: readonly unknown[]) =>
  prefix.every((part, index) => key[index] === part);

describe('agricultural input query keys', () => {
  it('hangs every catalog from the key that writes invalidate', () => {
    const all = queryKeys.agriculturalInputs.all();
    expect(startsWith(queryKeys.agriculturalInputs.list(null), all)).toBe(true);
    expect(startsWith(queryKeys.agriculturalInputs.list('p-1'), all)).toBe(
      true,
    );
  });

  it('keeps the catalog of each producer apart', () => {
    expect(queryKeys.agriculturalInputs.list('p-1')).not.toEqual(
      queryKeys.agriculturalInputs.list('p-2'),
    );
    expect(queryKeys.agriculturalInputs.list(null)).not.toEqual(
      queryKeys.agriculturalInputs.list('p-1'),
    );
  });
});

describe('input stock query keys', () => {
  it('hangs the stock of every farm from the key that movements invalidate', () => {
    const all = queryKeys.inputStocks.all();
    expect(startsWith(queryKeys.inputStocks.byFarm('f-1'), all)).toBe(true);
    expect(queryKeys.inputStocks.byFarm('f-1')).not.toEqual(
      queryKeys.inputStocks.byFarm('f-2'),
    );
  });

  it('keeps the movements of each input in each farm apart', () => {
    const all = queryKeys.inputMovements.all();
    const movements = queryKeys.inputMovements.list('i-1', 'f-1');
    expect(startsWith(movements, all)).toBe(true);
    expect(movements).not.toEqual(queryKeys.inputMovements.list('i-1', 'f-2'));
    expect(movements).not.toEqual(queryKeys.inputMovements.list('i-2', 'f-1'));
  });
});

describe('agricultural activity query keys', () => {
  it('hangs every read from the key that writes invalidate', () => {
    const all = queryKeys.agriculturalActivities.all();
    const { month, detail, assignees } = queryKeys.agriculturalActivities;
    expect(startsWith(month(null, '2026-10'), all)).toBe(true);
    expect(startsWith(detail('a-1'), all)).toBe(true);
    expect(startsWith(assignees(null), all)).toBe(true);
  });

  it('keeps each month of each producer apart', () => {
    const { month } = queryKeys.agriculturalActivities;
    expect(month(null, '2026-10')).not.toEqual(month(null, '2026-11'));
    expect(month('p-1', '2026-10')).not.toEqual(month('p-2', '2026-10'));
    expect(month(null, '2026-10')).not.toEqual(month('p-1', '2026-10'));
  });

  it('keeps the completion waiting in each device user apart', () => {
    const { queued } = queryKeys.agriculturalActivities;
    expect(queued('u-1', 'a-1')).not.toEqual(queued('u-2', 'a-1'));
    expect(queued('u-1', 'a-1')).not.toEqual(queued('u-1', 'a-2'));
  });
});
