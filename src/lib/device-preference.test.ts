import { afterEach, describe, expect, it, vi } from 'vitest';

import { readPreference, rememberPreference } from './device-preference';

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('device preference', () => {
  it('reads back what was remembered', () => {
    rememberPreference('facilities:last-farm:u1', 'f2');
    expect(readPreference('facilities:last-farm:u1')).toBe('f2');
  });

  it('reads nothing when nothing was remembered', () => {
    expect(readPreference('facilities:last-farm:u1')).toBeNull();
  });

  it('keeps each key apart', () => {
    rememberPreference('facilities:last-farm:u1', 'f2');
    expect(readPreference('facilities:last-farm:u2')).toBeNull();
  });

  it('reads nothing when the storage is not available', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readPreference('facilities:last-farm:u1')).toBeNull();
  });

  it('does not fail when the storage rejects a write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() =>
      rememberPreference('facilities:last-farm:u1', 'f2'),
    ).not.toThrow();
  });
});
