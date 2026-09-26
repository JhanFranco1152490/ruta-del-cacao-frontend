import { describe, expect, it } from 'vitest';

import { metadata } from './page';

describe('reset password page', () => {
  it('sends no referrer so the reset link token stays out of request logs', () => {
    expect(metadata.referrer).toBe('no-referrer');
  });
});
