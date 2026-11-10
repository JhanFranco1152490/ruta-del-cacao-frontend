import { describe, expect, it } from 'vitest';

import { buildStockRow } from '@/test/factories';

import {
  findStockOption,
  fullQuantityText,
  optionsForLine,
  stockKey,
  stockOptions,
} from './sale-line-options';

const LOT_A = { id: 'la', code: '000123-F02-P05-261014-1' };
const LOT_B = { id: 'lb', code: '000123-F02-P01-261020-1' };

const rows = [
  buildStockRow({ lot: LOT_A, grade: 'g2', quantity_kg: '55.2' }),
  buildStockRow({ lot: LOT_A, grade: 'g1', quantity_kg: '245.0' }),
  buildStockRow({
    lot: LOT_B,
    grade: 'g1',
    quantity_kg: '80.0',
    entry_date: '2026-11-02',
  }),
];

describe('stockOptions', () => {
  it('offers one option per lot and grade, by lot code and G1 first', () => {
    expect(stockOptions(rows).map(({ label, hint }) => [label, hint])).toEqual([
      ['000123-F02-P01-261020-1 · G1', 'Disponible: 80,0 kg'],
      ['000123-F02-P05-261014-1 · G1', 'Disponible: 245,0 kg'],
      ['000123-F02-P05-261014-1 · G2', 'Disponible: 55,2 kg'],
    ]);
  });

  it('keeps what a line needs to check its kilos and its date', () => {
    expect(stockOptions(rows)[0]).toMatchObject({
      value: stockKey('lb', 'g1'),
      lotId: 'lb',
      grade: 'g1',
      availableTenths: 800,
      entryDate: '2026-11-02',
    });
  });

  it('leaves out a grade with nothing left', () => {
    expect(
      stockOptions([buildStockRow({ lot: LOT_A, quantity_kg: '0.0' })]),
    ).toEqual([]);
  });
});

describe('optionsForLine', () => {
  const options = stockOptions(rows);
  const [b1, a1, a2] = options.map(({ value }) => value);

  it('does not offer what another line already took', () => {
    expect(
      optionsForLine(options, [a1, ''], 1).map(({ value }) => value),
    ).toEqual([b1, a2]);
  });

  it('keeps the choice of the line itself', () => {
    expect(
      optionsForLine(options, [a1, b1], 0).map(({ value }) => value),
    ).toEqual([a1, a2]);
  });
});

describe('findStockOption', () => {
  it('finds the stock a line chose, or nothing', () => {
    const options = stockOptions(rows);
    expect(findStockOption(options, stockKey('la', 'g2'))?.grade).toBe('g2');
    expect(findStockOption(options, 'gone:g1')).toBeUndefined();
  });
});

describe('fullQuantityText', () => {
  it('writes everything that is available, with one decimal', () => {
    const [first, second] = stockOptions(rows);

    expect(fullQuantityText(first)).toBe('80,0');
    expect(fullQuantityText(second)).toBe('245,0');
    expect(fullQuantityText({ availableTenths: 552 })).toBe('55,2');
  });
});
