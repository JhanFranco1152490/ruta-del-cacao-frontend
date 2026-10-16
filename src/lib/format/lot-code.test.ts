import { describe, expect, it } from 'vitest';

import { parseLotCode, readLotCode } from './lot-code';

describe('parseLotCode', () => {
  it('separa el código en sus partes', () => {
    expect(parseLotCode('000123-F02-P05-261014-1')).toEqual({
      producer: 'PROD-000123',
      farmCode: 'F02',
      plotCode: 'P05',
      harvestDate: '2026-10-14',
      sequence: 1,
    });
  });

  it('acepta finca o parcela de tres cifras y consecutivo de dos', () => {
    expect(parseLotCode('000123-F100-P120-261014-10')).toMatchObject({
      farmCode: 'F100',
      plotCode: 'P120',
      sequence: 10,
    });
  });

  it('un texto que no es un código no se interpreta', () => {
    expect(parseLotCode('RC-26-0143')).toBeNull();
    expect(parseLotCode('000123-F2-P05-261014-1')).toBeNull();
  });
});

describe('readLotCode', () => {
  it('explica cada parte con los nombres de la finca y la parcela', () => {
    expect(
      readLotCode('000123-F02-P05-261014-1', {
        farmName: 'La Esperanza',
        plotName: 'Lote del río',
      }),
    ).toBe(
      'Productor PROD-000123 · Finca F02, La Esperanza · Parcela P05, Lote del río · Cosecha del 14 de octubre de 2026 · Primer lote de ese día',
    );
  });

  it('sin nombre de parcela queda solo su código', () => {
    expect(
      readLotCode('000123-F02-P05-261014-2', { farmName: 'La Esperanza' }),
    ).toBe(
      'Productor PROD-000123 · Finca F02, La Esperanza · Parcela P05 · Cosecha del 14 de octubre de 2026 · Segundo lote de ese día',
    );
  });

  it('desde el undécimo lote del día usa el número', () => {
    expect(readLotCode('000123-F100-P120-261014-11')).toBe(
      'Productor PROD-000123 · Finca F100 · Parcela P120 · Cosecha del 14 de octubre de 2026 · Lote 11 de ese día',
    );
  });
});
