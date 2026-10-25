import { describe, expect, it } from 'vitest';

import { lotCodeSegments, parseLotCode } from './lot-code';

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

describe('lotCodeSegments', () => {
  it('splits the code into named pieces with what each one says today', () => {
    expect(
      lotCodeSegments('000123-F02-P05-261014-1', {
        farmName: 'La Esperanza',
        plotName: 'Lote del río',
      }),
    ).toEqual([
      { value: '000123', label: 'Productor', note: 'PROD-000123' },
      { value: 'F02', label: 'Finca', note: 'La Esperanza' },
      { value: 'P05', label: 'Parcela', note: 'Lote del río' },
      { value: '261014', label: 'Cosecha', note: '14 de octubre de 2026' },
      {
        value: '1',
        label: 'Consecutivo',
        note: 'Primer lote de ese día',
      },
    ]);
  });

  it('falls back to the code when the farm or the plot has no name', () => {
    const segments = lotCodeSegments('000123-F02-P05-261014-12');

    expect(segments?.[1].note).toBe('F02');
    expect(segments?.[2].note).toBe('P05');
    expect(segments?.[4].note).toBe('Lote 12 de ese día');
  });

  it('does not read a text that is not a lot code', () => {
    expect(lotCodeSegments('RC-26-0143')).toBeNull();
  });
});
