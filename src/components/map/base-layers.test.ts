import { describe, expect, it } from 'vitest';

import { BASE_LAYERS, createTileFallback } from './base-layers';

describe('BASE_LAYERS', () => {
  it('backs the street map with a second source', () => {
    expect(BASE_LAYERS.map).toHaveLength(2);
    expect(BASE_LAYERS.satellite).toHaveLength(1);
  });
});

describe('createTileFallback', () => {
  it('moves to the next source when the first fails before loading a tile', () => {
    const fallback = createTileFallback(2);

    expect(fallback.tileFailed(0)).toBe('next');
  });

  it('ignores a failed tile once the source has loaded one', () => {
    const fallback = createTileFallback(2);
    fallback.tileLoaded(0);

    expect(fallback.tileFailed(0)).toBe('ignore');
  });

  it('ignores late failures from a source it already left', () => {
    const fallback = createTileFallback(2);
    fallback.tileFailed(0);

    expect(fallback.tileFailed(0)).toBe('ignore');
  });

  it('reports once when every source failed', () => {
    const fallback = createTileFallback(2);
    fallback.tileFailed(0);

    expect(fallback.tileFailed(1)).toBe('exhausted');
    expect(fallback.tileFailed(1)).toBe('ignore');
  });
});
