import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/errors';

import {
  REVIEW_MESSAGE,
  saveErrorMessage,
  saveFailureSummary,
  STALE_MESSAGE,
} from './parameters-errors';

const apiError = (
  status: number,
  code: string,
  fields: Record<string, string[]> = {},
) => new ApiError(status, { detail: 'Error de prueba.', code, fields });

describe('saveErrorMessage', () => {
  it('tells a network failure apart from a rejection', () => {
    expect(saveErrorMessage(new TypeError('Failed to fetch'))).toContain(
      'Revisa tu conexión',
    );
  });

  it('says someone else changed the parameters', () => {
    expect(saveErrorMessage(apiError(409, 'stale_version'))).toBe(
      STALE_MESSAGE,
    );
  });

  it('uses what the server said otherwise', () => {
    expect(saveErrorMessage(apiError(403, 'permission_denied'))).toBe(
      'Error de prueba.',
    );
  });
});

describe('saveFailureSummary', () => {
  it('puts each error next to its field and asks to review them', () => {
    const setError = vi.fn();

    expect(
      saveFailureSummary(
        apiError(400, 'validation_error', {
          entry_moisture_min_pct: [
            'El mínimo no puede ser mayor que el máximo',
          ],
        }),
        setError,
      ),
    ).toBe(REVIEW_MESSAGE);
    expect(setError).toHaveBeenCalledWith('entry_moisture_min_pct', {
      type: 'server',
      message: 'El mínimo no puede ser mayor que el máximo',
    });
  });

  it('says the rest above the form', () => {
    expect(saveFailureSummary(apiError(409, 'stale_version'), vi.fn())).toBe(
      STALE_MESSAGE,
    );
  });
});
