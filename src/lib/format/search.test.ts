import { describe, expect, it } from 'vitest';

import { matchesSearch } from './search';

describe('matchesSearch', () => {
  it('ignores accents, case and surrounding spaces', () => {
    expect(matchesSearch(['Cúcuta'], '  CUCUTA ')).toBe(true);
  });

  it('matches when any field contains the text', () => {
    expect(
      matchesSearch(['La Esperanza', 'Vereda El Pórtico'], 'portico'),
    ).toBe(true);
    expect(matchesSearch(['La Esperanza'], 'pamplona')).toBe(false);
  });

  it('matches everything when the search is empty', () => {
    expect(matchesSearch(['La Esperanza'], '   ')).toBe(true);
  });
});
