import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { buildSale } from '@/test/factories';

import {
  INVOICE_FORMAT_MESSAGE,
  LOT_LEFT_WAREHOUSE_MESSAGE,
  LOT_OF_OTHER_FARM_MESSAGE,
  saleFailureOf,
} from './sale-errors';

const rejection = (
  status: number,
  code: string,
  {
    detail = 'Rechazado por el servidor.',
    fields = {},
    ...extra
  }: {
    detail?: string;
    fields?: Record<string, string[]>;
    [key: string]: unknown;
  } = {},
) => new ApiError(status, { detail, code, fields, ...extra });

describe('saleFailureOf', () => {
  it('puts the kilos someone else took in their line, with what is left', () => {
    expect(
      saleFailureOf(
        rejection(400, 'stock_insufficient', {
          fields: { lines: ['La cantidad supera lo disponible (95,0 kg)'] },
          line: 1,
          available_kg: '95.0',
        }),
      ),
    ).toEqual({
      kind: 'line',
      index: 1,
      field: 'quantity_kg',
      message: 'La cantidad supera lo disponible (95,0 kg)',
      availableKg: '95.0',
    });
  });

  it('marks the lot of a line that left the warehouse or is of another farm', () => {
    expect(
      saleFailureOf(
        rejection(409, 'lot_invalid_status', {
          line: 0,
          current_status: 'discarded',
        }),
      ),
    ).toMatchObject({
      kind: 'line',
      index: 0,
      field: 'stock',
      message: LOT_LEFT_WAREHOUSE_MESSAGE,
    });
    expect(
      saleFailureOf(rejection(404, 'not_found', { line: 2 })),
    ).toMatchObject({
      kind: 'line',
      index: 2,
      message: LOT_OF_OTHER_FARM_MESSAGE,
    });
  });

  it('leaves a not found without a line as a message above the form', () => {
    expect(saleFailureOf(rejection(404, 'not_found'))).toEqual({
      kind: 'form',
      message: 'Rechazado por el servidor.',
    });
  });

  it('puts an inactive buyer in its field', () => {
    expect(
      saleFailureOf(
        rejection(422, 'buyer_inactive', {
          fields: { buyer_id: ['El comprador está inactivo.'] },
        }),
      ),
    ).toEqual({
      kind: 'field',
      field: 'buyer_id',
      message: 'El comprador está inactivo.',
    });
  });

  it('sends the errors of the lines it cannot place above them', () => {
    expect(
      saleFailureOf(
        rejection(400, 'validation_error', {
          fields: { lines: ['Este lote y calibre ya está en otra línea.'] },
        }),
      ),
    ).toEqual({
      kind: 'lines',
      message: 'Este lote y calibre ya está en otra línea.',
    });
  });

  it('puts a header error in its field before one of the lines', () => {
    expect(
      saleFailureOf(
        rejection(400, 'validation_error', {
          fields: {
            lines: ['Revisa el precio por kilo.'],
            sale_date: ['La fecha no puede ser futura'],
          },
        }),
      ),
    ).toMatchObject({ kind: 'field', field: 'sale_date' });
  });

  it('tells a voided sale and a stale one apart', () => {
    expect(saleFailureOf(rejection(409, 'sale_voided'))).toEqual({
      kind: 'voided',
      message: 'Rechazado por el servidor.',
    });
    const current = buildSale({ version: 2 });
    expect(saleFailureOf(rejection(409, 'stale_version', { current }))).toEqual(
      {
        kind: 'stale',
        message: 'Rechazado por el servidor.',
        current,
      },
    );
  });

  it('says what is wrong with the invoice file', () => {
    expect(saleFailureOf(rejection(413, 'invoice_too_large'))).toEqual({
      kind: 'invoice',
      message: 'El archivo supera el tamaño máximo de 5 MB.',
    });
    expect(saleFailureOf(rejection(415, 'invoice_format_not_allowed'))).toEqual(
      { kind: 'invoice', message: INVOICE_FORMAT_MESSAGE },
    );
  });

  it('asks to check the connection when the request did not arrive', () => {
    expect(saleFailureOf(new TypeError('Failed to fetch'))).toEqual({
      kind: 'form',
      message:
        'No fue posible guardar. Revisa tu conexión e inténtalo nuevamente.',
    });
  });
});
