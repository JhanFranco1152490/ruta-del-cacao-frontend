import { describe, expect, it } from 'vitest';

import { isRetryableStatus } from './adapters';

describe('isRetryableStatus', () => {
  it('retries what can get better on its own', () => {
    expect([401, 429, 500, 503].map(isRetryableStatus)).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });

  it('sends to the tray what needs someone to correct it', () => {
    expect([400, 403, 404, 409, 422].map(isRetryableStatus)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });
});
