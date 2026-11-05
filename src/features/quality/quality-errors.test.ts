import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { buildLotQuality } from '@/test/factories';

import { qualityFailureOf, STALE_MESSAGE } from './quality-errors';

const apiError = (
  status: number,
  code: string,
  extra: Record<string, unknown> = {},
  fields: Record<string, string[]> = {},
) =>
  new ApiError(status, { detail: 'Error de prueba.', code, fields, ...extra });

describe('qualityFailureOf', () => {
  it('says the lot already changed status', () => {
    expect(
      qualityFailureOf(
        apiError(409, 'lot_invalid_status', { current_status: 'evaluated' }),
        'evaluar',
      ),
    ).toEqual({ kind: 'status', message: 'El lote ya está evaluado.' });
  });

  it('says a classified or discarded lot can no longer be corrected', () => {
    expect(
      qualityFailureOf(
        apiError(409, 'lot_invalid_status', { current_status: 'discarded' }),
        'corregir',
      ),
    ).toEqual({
      kind: 'status',
      message: 'El lote ya fue descartado y no se puede corregir.',
    });
  });

  it('carries the current values of a stale correction', () => {
    const current = buildLotQuality();
    expect(
      qualityFailureOf(apiError(409, 'stale_version', { current }), 'corregir'),
    ).toEqual({ kind: 'stale', message: STALE_MESSAGE, current });
  });

  it('puts a sum over 100 under the last percentage', () => {
    expect(
      qualityFailureOf(
        apiError(400, 'quality_sum_exceeds_100', { total_pct: '104.0' }),
        'evaluar',
      ),
    ).toEqual({
      kind: 'field',
      field: 'other_defects_pct',
      message: 'La suma no puede pasar de 100 %',
    });
  });

  it('says the difference the server found in the classification', () => {
    expect(
      qualityFailureOf(
        apiError(400, 'classification_sum_mismatch', {
          difference_kg: '-4.8',
        }),
        'clasificar',
      ),
    ).toEqual({ kind: 'form', message: 'Sobran 4,8 kg' });
  });

  it('puts a validation error in its field', () => {
    expect(
      qualityFailureOf(
        apiError(
          400,
          'validation_error',
          {},
          {
            reason: ['Indique el motivo del descarte'],
          },
        ),
        'descartar',
      ),
    ).toEqual({
      kind: 'field',
      field: 'reason',
      message: 'Indique el motivo del descarte',
    });
  });

  it('asks to check the connection when the request did not reach', () => {
    expect(qualityFailureOf(new TypeError('fetch'), 'clasificar').kind).toBe(
      'form',
    );
  });
});
