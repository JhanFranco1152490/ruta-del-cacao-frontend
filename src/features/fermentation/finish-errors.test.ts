import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';

import { finishFailureOf } from './finish-errors';

const apiError = (
  status: number,
  code: string,
  fields: Record<string, string[]> = {},
) => new ApiError(status, { detail: 'Error de prueba.', code, fields });

describe('finishFailureOf', () => {
  it('puts the end the server rejected in its field, with the time it gives', () => {
    expect(
      finishFailureOf(
        apiError(400, 'validation_error', {
          ended_at: [
            'No puede ser anterior al último volteo (20/10/2026 08:00).',
          ],
        }),
      ),
    ).toEqual({
      kind: 'field',
      field: 'ended_at',
      message: 'No puede ser anterior al último volteo (20/10/2026 08:00).',
    });
  });

  it.each([
    [
      'fermentation_without_turns',
      'Registre al menos un volteo para finalizar',
    ],
    [
      'fermentation_not_in_progress',
      'La fermentación de este lote ya se finalizó.',
    ],
    [
      'stale_version',
      'Otra persona cambió esta fermentación. Cierra y vuelve a abrirla para ver sus datos actuales.',
    ],
    ['facility_not_occupied_by_lot', 'Error de prueba.'],
  ])('explains %s above the form', (code, message) => {
    expect(finishFailureOf(apiError(409, code))).toEqual({
      kind: 'form',
      message,
    });
  });

  it('asks to check the connection when the server did not answer', () => {
    expect(finishFailureOf(new TypeError('Failed to fetch'))).toEqual({
      kind: 'form',
      message:
        'No fue posible finalizar. Revisa tu conexión e inténtalo nuevamente.',
    });
  });
});
