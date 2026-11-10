import { describe, expect, it } from 'vitest';

import { normalizeBuyerName } from './buyer-name';

describe('normalizeBuyerName', () => {
  it('ignores case, accents, spaces, dashes and dots', () => {
    expect(normalizeBuyerName('Chocolates del Oriente S.A.S.')).toBe(
      normalizeBuyerName('chocolates del oriente sas'),
    );
    expect(normalizeBuyerName('Acopio Cúcuta-Norte')).toBe(
      normalizeBuyerName('acopio cucuta norte'),
    );
  });

  it('keeps names that differ in letters apart', () => {
    expect(normalizeBuyerName('Cacao Andino')).not.toBe(
      normalizeBuyerName('Cacao Andina'),
    );
  });
});
