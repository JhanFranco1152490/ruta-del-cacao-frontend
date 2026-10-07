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
