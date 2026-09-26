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

    expect(applied).toEqual({ applied: true, unmatched: ['x'] });
    expect(setError).toHaveBeenCalledTimes(1);
    expect(setError).toHaveBeenCalledWith('email', {
      type: 'server',
      message: 'Correo inválido.',
    });
  });

  it('reports nothing applied and gives back the messages of unknown fields', () => {
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

    expect(applyApiFieldErrors(noField, setError, ['email'])).toEqual({
      applied: false,
      unmatched: [],
    });
    expect(applyApiFieldErrors(unknownOnly, setError, ['email'])).toEqual({
      applied: false,
      unmatched: ['y'],
    });
    expect(
      applyApiFieldErrors(new TypeError('x'), setError, ['email']),
    ).toEqual({ applied: false, unmatched: [] });
    expect(setError).not.toHaveBeenCalled();
  });

  it('gives back every message of every unknown field, in order', () => {
    const setError = vi.fn();
    const error = new ApiError(400, {
      detail: 'Datos inválidos',
      code: 'validation_error',
      fields: { a: ['Uno.', 'Dos.'], email: ['Malo.'], b: ['Tres.'] },
    });

    expect(applyApiFieldErrors(error, setError, ['email'])).toEqual({
      applied: true,
      unmatched: ['Uno.', 'Dos.', 'Tres.'],
    });
  });

  it('does not count a known field without messages as applied', () => {
    const setError = vi.fn();
    const error = new ApiError(400, {
      detail: 'x',
      code: 'validation_error',
      fields: { email: [] },
    });

    expect(applyApiFieldErrors(error, setError, ['email'])).toEqual({
      applied: false,
      unmatched: [],
    });
    expect(setError).not.toHaveBeenCalled();
  });
});
