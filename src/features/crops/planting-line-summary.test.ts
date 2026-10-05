import { describe, expect, it } from 'vitest';

import { plantingLineSummary } from './planting-line-summary';

describe('plantingLineSummary', () => {
  it('reads a complete planting in one line', () => {
    expect(
      plantingLineSummary({
        variety: 'CCN-51',
        month: '2021-03',
        trees: '1800',
        stage: 'full_production',
      }),
    ).toBe('CCN-51 · marzo de 2021 · 1.800 árboles · Producción estable');
  });

  it('uses the singular for one tree', () => {
    expect(
      plantingLineSummary({
        variety: 'CCN-51',
        trees: '1',
        month: '',
        stage: '',
      }),
    ).toBe('CCN-51 · 1 árbol');
  });

  it('leaves out what is still empty', () => {
    expect(
      plantingLineSummary({
        variety: 'FSA-12 · Saravena',
        month: '',
        trees: '',
        stage: 'establishment',
      }),
    ).toBe('FSA-12 · Saravena · Establecimiento o formación');
  });

  it('ignores a month that is only half chosen and trees that are not a number', () => {
    expect(
      plantingLineSummary({
        variety: 'CCN-51',
        month: '2021-',
        trees: 'abc',
        stage: '',
      }),
    ).toBe('CCN-51');
  });

  it('says it is not filled in yet when there is nothing', () => {
    expect(
      plantingLineSummary({ variety: '', month: '', trees: '', stage: '' }),
    ).toBe('Sin completar');
  });
});
