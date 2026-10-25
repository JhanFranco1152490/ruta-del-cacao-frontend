import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/errors';

import { correctionError, DUPLICATE_ERROR } from './turn-errors';

const apiError = (status: number, code: string, fields = {}) =>
  new ApiError(status, { detail: 'Error de prueba.', code, fields });

describe('correctionError', () => {
  it('marks the time when another turn is at that minute', () => {
    const setError = vi.fn();

    expect(
      correctionError(apiError(409, 'duplicate_turn_time'), setError),
    ).toBeUndefined();
    expect(setError).toHaveBeenCalledWith('turned_at', {
      type: DUPLICATE_ERROR,
      message: 'Error de prueba.',
    });
  });

  it('puts each rejected value next to its field', () => {
    const setError = vi.fn();

    expect(
      correctionError(
        apiError(400, 'validation_error', { ph: ['pH válido entre 0 y 14'] }),
        setError,
      ),
    ).toBeUndefined();
    expect(setError).toHaveBeenCalledWith('ph', {
      type: 'server',
      message: 'pH válido entre 0 y 14',
    });
  });

  it.each([
    [
      'stale_version',
      'Otra persona cambió este volteo. Vuelve a abrirlo para ver sus datos actuales.',
    ],
    [
      'fermentation_not_in_progress',
      'La fermentación de este lote ya se finalizó: sus volteos ya no se corrigen.',
    ],
    ['not_found', 'Este volteo ya no existe.'],
  ])('explains %s above the form', (code, message) => {
    expect(correctionError(apiError(409, code), vi.fn())).toBe(message);
  });

  it('asks to check the connection when the server did not answer', () => {
    expect(correctionError(new TypeError('Failed to fetch'), vi.fn())).toBe(
      'No fue posible corregir el volteo. Revisa tu conexión e inténtalo nuevamente.',
    );
  });
});
