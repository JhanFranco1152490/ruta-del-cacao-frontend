import { describe, expect, it } from 'vitest';

import { placeText } from './place-text';

describe('placeText', () => {
  it('names the warehouse and the location', () => {
    expect(placeText('Bodega principal', 'Estante 1')).toBe(
      'Bodega principal · Estante 1',
    );
  });

  it('names only the warehouse without a location', () => {
    expect(placeText('Bodega principal', '  ')).toBe('Bodega principal');
  });
});
