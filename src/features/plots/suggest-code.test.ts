import { describe, expect, it } from 'vitest';

import { suggestPlotCode } from './suggest-code';

describe('suggestPlotCode', () => {
  it('starts at P1 when the farm has no plots', () => {
    expect(suggestPlotCode([])).toBe('P1');
  });

  it('takes the number after the highest one', () => {
    expect(suggestPlotCode(['P1', 'P2', 'P5'])).toBe('P6');
  });

  it('keeps the style of the existing codes, prefix and zeros included', () => {
    expect(suggestPlotCode(['P-01', 'P-02'])).toBe('P-03');
    expect(suggestPlotCode(['Lote 9', 'Lote 10'])).toBe('Lote 11');
    expect(suggestPlotCode(['A007'])).toBe('A008');
  });

  it('follows the style of the plot with the highest number', () => {
    expect(suggestPlotCode(['P1', 'Lote 4'])).toBe('Lote 5');
  });

  it('starts at P1 when no code ends in a number', () => {
    expect(suggestPlotCode(['El Mango', 'La Loma'])).toBe('P1');
  });

  it('never suggests a code that is taken, whatever its case or spaces', () => {
    expect(
      suggestPlotCode(['p3', ' P1 ', 'P2 · El Mango']).toLowerCase(),
    ).not.toBe('p3');
    // Sigue el estilo del código con el número mayor, minúscula incluida.
    expect(suggestPlotCode(['P2', 'p3'])).toBe('p4');
  });

  it('skips a free number that clashes with a code written differently', () => {
    expect(suggestPlotCode(['P-01', 'p-02 '])).toBe('p-03');
  });
});
