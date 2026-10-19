import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';

import { isNeverLoaded, isPausedWithoutData } from './paused-read';

const query = (overrides: Partial<Parameters<typeof isNeverLoaded>[0]>) => ({
  isPending: false,
  fetchStatus: 'idle',
  isError: false,
  error: null,
  ...overrides,
});

describe('isPausedWithoutData', () => {
  it('is a read with no data waiting for the network', () => {
    expect(
      isPausedWithoutData(query({ isPending: true, fetchStatus: 'paused' })),
    ).toBe(true);
    expect(
      isPausedWithoutData(query({ isPending: true, fetchStatus: 'fetching' })),
    ).toBe(false);
  });
});

describe('isNeverLoaded', () => {
  it('is a read paused without data or failed for lack of network', () => {
    expect(
      isNeverLoaded(query({ isPending: true, fetchStatus: 'paused' })),
    ).toBe(true);
    expect(
      isNeverLoaded(
        query({ isError: true, error: new TypeError('Failed to fetch') }),
      ),
    ).toBe(true);
  });

  it('is not an error of the API nor a read in progress', () => {
    expect(
      isNeverLoaded(
        query({
          isError: true,
          error: new ApiError(403, {
            detail: 'Sin permiso.',
            code: 'permission_denied',
            fields: {},
          }),
        }),
      ),
    ).toBe(false);
    expect(
      isNeverLoaded(query({ isPending: true, fetchStatus: 'fetching' })),
    ).toBe(false);
  });
});
