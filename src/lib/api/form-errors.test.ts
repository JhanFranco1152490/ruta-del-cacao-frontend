import { describe, expect, it, vi } from 'vitest';

import { ApiError } from './errors';
import { applyApiFieldErrors } from './form-errors';

describe('applyApiFieldErrors', () => {
  it('sets the first message of each known field and reports it', () => {
    const setError = vi.fn();
    const error = new ApiError(400, {
      detail: 'Datos inválidos',
      code: 'validation_error',
      fields: { email: ['Correo inválido.', 'Otro'], unknown_field: ['x'] },
    });

    const applied = applyApiFieldErrors(error, setError, ['email', 'phone']);

    expect(applied).toBe(true);
    expect(setError).toHaveBeenCalledTimes(1);
    expect(setError).toHaveBeenCalledWith('email', {
      type: 'server',
      message: 'Correo inválido.',
    });
  });

  it('returns false when nothing could be applied', () => {
    const setError = vi.fn();
    const noField = new ApiError(409, {
      detail: 'Conflicto',
      code: 'stale_version',
      fields: {},
    });
    const unknownOnly = new ApiError(400, {
      detail: 'x',
      code: 'validation_error',
      fields: { other: ['y'] },
    });

    expect(applyApiFieldErrors(noField, setError, ['email'])).toBe(false);
    expect(applyApiFieldErrors(unknownOnly, setError, ['email'])).toBe(false);
    expect(applyApiFieldErrors(new TypeError('x'), setError, ['email'])).toBe(
      false,
    );
    expect(setError).not.toHaveBeenCalled();
  });
});
