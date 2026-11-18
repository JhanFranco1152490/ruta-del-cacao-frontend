import { describe, expect, it } from 'vitest';

import type { ReportCellKind } from './api';
import { formatCell, isNumericKind } from './report-cells';

describe('formatCell', () => {
  it('writes a date with its year, since a report can span two', () => {
    expect(formatCell('2026-02-03', 'date')).toBe('03/02/2026');
  });

  it('keeps one decimal in kilos and percentages, also when it is zero', () => {
    expect(formatCell('120.0', 'kg')).toBe('120,0');
    expect(formatCell('33.8', 'pct')).toBe('33,8');
  });

  it('adds the unit when the value shares a cell with others', () => {
    expect(formatCell('40.5', 'kg', { withUnit: true })).toBe('40,5 kg');
    expect(formatCell('33.8', 'pct', { withUnit: true })).toBe('33,8 %');
    expect(formatCell('2026-02-03', 'date', { withUnit: true })).toBe(
      '03/02/2026',
    );
  });

  it('writes pesos whole and counts without decimals', () => {
    expect(formatCell(2775000, 'money')).toBe('$ 2.775.000');
    expect(formatCell(18, 'count')).toBe('18');
  });

  it('leaves text as it comes', () => {
    expect(formatCell('F02 · La Esperanza', 'text')).toBe('F02 · La Esperanza');
  });

  // Una etapa que no ha ocurrido llega vacía: no es un cero.
  it('shows a dash where there is no value', () => {
    expect(formatCell(null, 'kg')).toBe('—');
    expect(formatCell(null, 'date')).toBe('—');
    expect(formatCell('', 'text')).toBe('—');
  });
});

describe('isNumericKind', () => {
  it('aligns kilos, percentages, pesos and counts to the right', () => {
    const numeric: ReportCellKind[] = ['kg', 'pct', 'money', 'count'];

    expect(numeric.every((kind) => isNumericKind(kind))).toBe(true);
    expect(isNumericKind('text')).toBe(false);
    expect(isNumericKind('date')).toBe(false);
  });
});
