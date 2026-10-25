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

const failure = (error: unknown) => startFailureOf(error, 'M-01');

describe('startFailureOf', () => {
  it('asks to confirm when the humidity is out of range, with the range of the server', () => {
    expect(
      failure(
        apiError(
          422,
          'entry_moisture_out_of_range',
          { range: { min: '55.0', max: '60.0' } },
          { entry_moisture_pct: ['Fuera del rango.'] },
        ),
      ),
    ).toEqual({ kind: 'moisture', min: '55.0', max: '60.0' });
  });

  it('asks for another dryer when the chosen one was taken, and reloads them', () => {
    expect(failure(apiError(409, 'facility_unavailable'))).toEqual({
      kind: 'field',
      field: 'facility_id',
      message: 'M-01 ya no está disponible. Elige otra.',
      reload: true,
    });
  });

  it('says the status the lot has now', () => {
    expect(
      failure(
        apiError(409, 'lot_invalid_status', { current_status: 'drying' }),
      ),
    ).toEqual({
      kind: 'form',
      message: 'Este lote ya no está Fermentado (ahora: En secado).',
    });
  });

  it('marks the responsible when the account cannot answer for the drying', () => {
    expect(
      failure(
        apiError(
          400,
          'responsible_not_available',
          {},
          { responsible_id: ['Esa cuenta no puede responder.'] },
        ),
      ),
    ).toEqual({
      kind: 'field',
      field: 'responsible_id',
      message: 'Esa cuenta no puede responder.',
    });
  });

  it('explains that a drying with logs no longer corrects its start', () => {
    expect(failure(apiError(409, 'drying_has_logs'))).toEqual({
      kind: 'form',
      message: 'Este secado ya tiene bitácoras: su inicio ya no se corrige.',
    });
  });

  it('asks to open the drying again when someone else changed it', () => {
    expect(failure(apiError(409, 'stale_version'))).toMatchObject({
      kind: 'form',
      message: expect.stringContaining('Otra persona cambió este secado'),
    });
  });

  it('marks the field a validation error points to', () => {
    expect(
      failure(
        apiError(
          400,
          'validation_error',
          {},
          { entry_moisture_pct: ['Debe estar entre 0 % y 100 %.'] },
        ),
      ),
    ).toEqual({
      kind: 'field',
      field: 'entry_moisture_pct',
      message: 'Debe estar entre 0 % y 100 %.',
    });
  });

  it('tells a network failure apart from a rejection', () => {
    expect(failure(new TypeError('Failed to fetch'))).toMatchObject({
      kind: 'form',
      message: expect.stringContaining('Revisa tu conexión'),
    });
  });
});
