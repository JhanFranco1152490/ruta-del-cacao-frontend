import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';

import { startFailureOf } from './start-errors';

const apiError = (
  status: number,
  code: string,
  extra: Record<string, unknown> = {},
  fields: Record<string, string[]> = {},
) =>
  new ApiError(status, { detail: 'Error de prueba.', code, fields, ...extra });

const failure = (error: unknown) => startFailureOf(error, 'C-01');

describe('startFailureOf', () => {
  it('asks to confirm when the lot is over the capacity, with the figures of the server', () => {
    expect(
      failure(
        apiError(422, 'lot_exceeds_capacity', {
          capacity_kg: '450.0',
          green_weight_kg: '500.0',
        }),
      ),
    ).toEqual({
      kind: 'capacity',
      capacityKg: '450.0',
      greenWeightKg: '500.0',
    });
  });

  it('asks for another box when the chosen one was taken, and reloads them', () => {
    expect(failure(apiError(409, 'facility_unavailable'))).toEqual({
      kind: 'field',
      field: 'facility_id',
      message: 'C-01 ya no está disponible. Elige otro.',
      reload: true,
    });
  });

  it('says the status the lot has now', () => {
    expect(
      failure(
        apiError(409, 'lot_invalid_status', { current_status: 'fermenting' }),
      ),
    ).toEqual({
      kind: 'form',
      message: 'Este lote ya no está Generado (ahora: En fermentación).',
    });
  });

  it('marks the responsible who can no longer respond', () => {
    expect(
      failure(
        apiError(
          422,
          'responsible_not_available',
          {},
          { responsible_id: ['Esta cuenta no puede responder.'] },
        ),
      ),
    ).toEqual({
      kind: 'field',
      field: 'responsible_id',
      message: 'Esta cuenta no puede responder.',
    });
  });

  it('marks the start the server rejected', () => {
    expect(
      failure(
        apiError(
          400,
          'validation_error',
          {},
          { started_at: ['No puede ser anterior a la cosecha (14/10/2026).'] },
        ),
      ),
    ).toEqual({
      kind: 'field',
      field: 'started_at',
      message: 'No puede ser anterior a la cosecha (14/10/2026).',
    });
  });

  it.each([
    [
      'fermentation_has_turns',
      'Esta fermentación ya tiene volteos: su inicio ya no se corrige.',
    ],
    [
      'stale_version',
      'Otra persona cambió esta fermentación. Cierra y vuelve a abrirla para ver sus datos actuales.',
    ],
    ['lot_already_in_facility', 'Error de prueba.'],
  ])('explains %s above the form', (code, message) => {
    expect(failure(apiError(409, code))).toEqual({ kind: 'form', message });
  });

  it('asks to check the connection when the server did not answer', () => {
    expect(failure(new TypeError('Failed to fetch'))).toEqual({
      kind: 'form',
      message:
        'No fue posible guardar. Revisa tu conexión e inténtalo nuevamente.',
    });
  });
});
