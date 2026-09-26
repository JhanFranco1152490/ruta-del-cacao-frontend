import { describe, expect, it } from 'vitest';

import {
  ApiError,
  RATE_LIMIT_MESSAGE,
  getErrorMessage,
  isApiError,
  isUnauthorized,
} from './errors';

const body = (code: string, detail = 'Detalle del servidor') => ({
  detail,
  code,
  fields: {},
});

describe('ApiError', () => {
  it('exposes status, code, fields and uses detail as its message', () => {
    const error = new ApiError(409, {
      detail: 'Conflicto',
      code: 'stale_version',
      fields: { name: ['Repetido.'] },
    });

    expect(error.status).toBe(409);
    expect(error.code).toBe('stale_version');
    expect(error.fields).toEqual({ name: ['Repetido.'] });
    expect(error.message).toBe('Conflicto');
    expect(isApiError(error)).toBe(true);
  });

  it('recognizes only 401 as unauthorized', () => {
    expect(
      isUnauthorized(new ApiError(401, body('authentication_failed'))),
    ).toBe(true);
    expect(isUnauthorized(new ApiError(403, body('permission_denied')))).toBe(
      false,
    );
    expect(isUnauthorized(new TypeError('Failed to fetch'))).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it('uses the server detail for API errors', () => {
    expect(
      getErrorMessage(new ApiError(400, body('validation_error')), 'x'),
    ).toBe('Detalle del servidor');
  });

  it('uses a fixed message when the request was throttled', () => {
    expect(
      getErrorMessage(new ApiError(429, body('throttled', 'Throttled')), 'x'),
    ).toBe(RATE_LIMIT_MESSAGE);
  });

  it('falls back for network errors and unknown values', () => {
    expect(
      getErrorMessage(new TypeError('Failed to fetch'), 'Sin conexión'),
    ).toBe('Sin conexión');
    expect(getErrorMessage('boom', 'Sin conexión')).toBe('Sin conexión');
  });
});
