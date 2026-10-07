import { describe, expect, it } from 'vitest';

import { matchesSearch, normalizeCatalogName } from './search';

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

describe('normalizeCatalogName', () => {
  it('treats spaces, hyphens, case and accents as the same name', () => {
    const expected = normalizeCatalogName('CCN-51');
    expect(normalizeCatalogName('CCN 51')).toBe(expected);
    expect(normalizeCatalogName('CCN51')).toBe(expected);
    expect(normalizeCatalogName(' ccn-51 ')).toBe(expected);
    expect(normalizeCatalogName('Híbrido común')).toBe(
      normalizeCatalogName('hibrido comun'),
    );
  });

  it('compares product names the same way', () => {
    const expected = normalizeCatalogName('Urea 46%');
    expect(normalizeCatalogName(' urea 46 % ')).toBe(expected);
    expect(normalizeCatalogName('UREA-46%')).toBe(expected);
    expect(normalizeCatalogName('Óxicloruro de cobre')).toBe(
      normalizeCatalogName('oxicloruro de cobre'),
    );
  });

  it('treats the dashes pasted from a document as hyphens, like the server', () => {
    const expected = normalizeCatalogName('CCN-51');
    for (const dash of [
      '\u2010',
      '\u2011',
      '\u2012',
      '\u2013',
      '\u2014',
      '\u2212',
    ]) {
      expect(normalizeCatalogName(`CCN${dash}51`)).toBe(expected);
    }
  });
});
