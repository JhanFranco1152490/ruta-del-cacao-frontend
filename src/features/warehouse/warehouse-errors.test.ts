import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';

import { lotStatusMessage, warehouseFailureOf } from './warehouse-errors';

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

describe('warehouseFailureOf', () => {
  it('says the lot moved on when it is no longer classified', () => {
    expect(
      warehouseFailureOf(
        rejection(409, 'lot_invalid_status', {
          current_status: 'in_warehouse',
        }),
        'entry',
      ),
    ).toEqual({ kind: 'status', message: 'El lote ya está en bodega.' });
  });

  it('closes with the server text when the action no longer applies', () => {
    for (const code of [
      'lot_nothing_to_store',
      'entry_has_movements',
      'exit_already_voided',
      'exit_not_voidable',
    ]) {
      expect(
        warehouseFailureOf(rejection(409, code, { detail: 'Ya no.' }), 'exit'),
      ).toEqual({ kind: 'status', message: 'Ya no.' });
    }
  });

  it('puts the lack of stock in the quantity, with what is available', () => {
    expect(
      warehouseFailureOf(
        rejection(400, 'stock_insufficient', { available_kg: '245.0' }),
        'exit',
      ),
    ).toEqual({
      kind: 'field',
      field: 'quantity_kg',
      message: 'La cantidad supera lo disponible (245,0 kg)',
      availableKg: '245.0',
    });
  });

  it('puts a taken name or an unusable warehouse in its field', () => {
    expect(
      warehouseFailureOf(
        rejection(409, 'warehouse_name_taken', {
          fields: { name: ['Ya existe.'] },
        }),
        'warehouse',
      ),
    ).toEqual({ kind: 'field', field: 'name', message: 'Ya existe.' });
    expect(
      warehouseFailureOf(
        rejection(400, 'warehouse_inactive', {
          fields: { warehouse_id: ['Desactivada.'] },
        }),
        'entry',
      ),
    ).toEqual({
      kind: 'field',
      field: 'warehouse_id',
      message: 'Desactivada.',
    });
  });

  it('puts a validation error in the first field of the form that has one', () => {
    expect(
      warehouseFailureOf(
        rejection(400, 'validation_error', {
          fields: { location: ['Máximo 60 caracteres.'] },
        }),
        'entry',
      ),
    ).toEqual({
      kind: 'field',
      field: 'location',
      message: 'Máximo 60 caracteres.',
    });
  });

  it('reloads on a stale version and offers to deactivate a used warehouse', () => {
    expect(
      warehouseFailureOf(rejection(409, 'stale_version'), 'entry').kind,
    ).toBe('stale');
    expect(
      warehouseFailureOf(rejection(409, 'warehouse_has_records'), 'delete')
        .kind,
    ).toBe('in-use');
  });

  it('leaves the rest above the form', () => {
    expect(
      warehouseFailureOf(
        rejection(422, 'farm_inactive', { detail: 'Finca inactiva.' }),
        'warehouse',
      ),
    ).toEqual({ kind: 'form', message: 'Finca inactiva.' });
    expect(warehouseFailureOf(new TypeError('fetch'), 'exit').kind).toBe(
      'form',
    );
  });
});

describe('lotStatusMessage', () => {
  it('does not trust a status it does not know', () => {
    expect(lotStatusMessage('zzz')).toBe('El lote cambió de estado.');
  });
});
