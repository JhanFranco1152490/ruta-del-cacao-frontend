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
