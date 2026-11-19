import { describe, expect, it } from 'vitest';

import { lotEmptyState } from './lot-empty-state';

describe('lotEmptyState', () => {
  it('says there are no lots yet without filters', () => {
    expect(lotEmptyState({ page: 1 })).toEqual({
      kind: 'none',
      title: 'Aún no hay lotes',
    });
  });

  it('says the farm has no lots when only the farm is chosen', () => {
    expect(lotEmptyState({ farm: 'f1', page: 1 })).toEqual({
      kind: 'filtered',
      title: 'No hay lotes asociados a esta finca.',
    });
  });

  it('says the plot has no lots when the plot is chosen', () => {
    expect(lotEmptyState({ farm: 'f1', plot: 'p1', page: 1 })).toEqual({
      kind: 'filtered',
      title: 'No hay lotes asociados a esta parcela.',
    });
  });

  it('keeps the search message when other filters are set', () => {
    for (const other of [
      { search: '0001' },
      { status: 'dried' as const },
      { variety: 'v1' },
      { from: '2026-01-01' },
      { to: '2026-03-31' },
    ]) {
      expect(lotEmptyState({ farm: 'f1', page: 1, ...other })).toEqual({
        kind: 'filtered',
        title: 'No se encontraron lotes',
      });
    }
    expect(lotEmptyState({ search: 'zzz', page: 1 }).title).toBe(
      'No se encontraron lotes',
    );
  });

  it('does not count the producer chosen by the technical account', () => {
    expect(lotEmptyState({ producer: 'p1', page: 1 }).kind).toBe('none');
  });
});
