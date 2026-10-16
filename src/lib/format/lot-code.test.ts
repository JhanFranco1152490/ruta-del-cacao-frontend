import { describe, expect, it } from 'vitest';

import { parseLotCode, readLotCode } from './lot-code';

describe('parseLotCode', () => {
  it('splits the code into its parts', () => {
    expect(parseLotCode('000123-F02-P05-261014-1')).toEqual({
      producer: 'PROD-000123',
      farmCode: 'F02',
      plotCode: 'P05',
      harvestDate: '2026-10-14',
      sequence: 1,
    });
  });

  it('accepts a three-digit farm or plot and a two-digit sequence', () => {
    expect(parseLotCode('000123-F100-P120-261014-10')).toMatchObject({
      farmCode: 'F100',
      plotCode: 'P120',
      sequence: 10,
    });
  });

  it('does not read a text that is not a lot code', () => {
    expect(parseLotCode('RC-26-0143')).toBeNull();
    expect(parseLotCode('000123-F2-P05-261014-1')).toBeNull();
  });
});

describe('readLotCode', () => {
  it('explains each part with the farm and plot names', () => {
    expect(
      readLotCode('000123-F02-P05-261014-1', {
        farmName: 'La Esperanza',
        plotName: 'Lote del río',
      }),
    ).toBe(
      'Productor PROD-000123 · Finca F02, La Esperanza · Parcela P05, Lote del río · Cosecha del 14 de octubre de 2026 · Primer lote de ese día',
    );
  });

  it('keeps only the plot code when it has no name', () => {
    expect(
      readLotCode('000123-F02-P05-261014-2', { farmName: 'La Esperanza' }),
    ).toBe(
      'Productor PROD-000123 · Finca F02, La Esperanza · Parcela P05 · Cosecha del 14 de octubre de 2026 · Segundo lote de ese día',
    );
  });

  it('uses the number from the eleventh lot of the day', () => {
    expect(readLotCode('000123-F100-P120-261014-11')).toBe(
      'Productor PROD-000123 · Finca F100 · Parcela P120 · Cosecha del 14 de octubre de 2026 · Lote 11 de ese día',
    );
  });
});
