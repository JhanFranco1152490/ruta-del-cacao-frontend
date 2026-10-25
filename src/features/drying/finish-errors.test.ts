import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';

import { finishFailureOf } from './finish-errors';

const apiError = (
  status: number,
  code: string,
  fields: Record<string, string[]> = {},
) =>
  new ApiError(status, {
    detail: 'Error de prueba.',
    code,
    fields,
  });

describe('finishFailureOf', () => {
  it('asks for a log first when the drying has none', () => {
    expect(finishFailureOf(apiError(409, 'drying_without_logs'))).toEqual({
      kind: 'form',
      message: 'Registra al menos una bitácora para finalizar.',
    });
  });

  it('says the drying already finished', () => {
    expect(finishFailureOf(apiError(409, 'drying_not_in_progress'))).toEqual({
      kind: 'form',
      message: 'El secado de este lote ya se finalizó.',
    });
  });

  it('asks to open the drying again when someone else changed it', () => {
    expect(finishFailureOf(apiError(409, 'stale_version'))).toMatchObject({
      kind: 'form',
      message: expect.stringContaining('Otra persona cambió este secado'),
    });
  });

  it.each(['ended_at', 'final_moisture_pct', 'dry_weight_kg'] as const)(
    'marks the %s field when the server points to it',
    (field) => {
      expect(
        finishFailureOf(
          apiError(400, 'validation_error', { [field]: ['Revisa este dato.'] }),
        ),
      ).toEqual({ kind: 'field', field, message: 'Revisa este dato.' });
    },
  );

  it('tells a network failure apart from a rejection', () => {
    expect(finishFailureOf(new TypeError('Failed to fetch'))).toMatchObject({
      kind: 'form',
      message: expect.stringContaining('Revisa tu conexión'),
    });
  });
});
