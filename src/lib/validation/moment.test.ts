import { describe, expect, it } from 'vitest';

import { isLocalDateTime } from './moment';

describe('isLocalDateTime', () => {
  it('only accepts a complete date and time', () => {
    expect(isLocalDateTime('2026-10-17T07:30')).toBe(true);
    expect(isLocalDateTime('2026-10-17T07')).toBe(false);
    expect(isLocalDateTime('')).toBe(false);
  });
});
