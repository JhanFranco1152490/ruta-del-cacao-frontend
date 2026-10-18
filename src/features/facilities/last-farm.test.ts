import { afterEach, describe, expect, it } from 'vitest';

import { readLastFarm, rememberLastFarm } from './last-farm';

afterEach(() => window.localStorage.clear());

describe('last farm', () => {
  it('remembers the farm each person chose on this device', () => {
    rememberLastFarm('u1', 'f2');

    expect(readLastFarm('u1')).toBe('f2');
    expect(readLastFarm('u2')).toBeNull();
  });

  it('is kept apart from other remembered choices', () => {
    rememberLastFarm('u1', 'f2');

    expect(window.localStorage.getItem('facilities:last-farm:u1')).toBe('f2');
  });
});
