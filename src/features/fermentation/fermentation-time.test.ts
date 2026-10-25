import { describe, expect, it } from 'vitest';

import { turnsText } from './fermentation-time';

describe('turnsText', () => {
  it('counts the turns in singular and plural', () => {
    expect(turnsText(1)).toBe('1 volteo');
    expect(turnsText(3)).toBe('3 volteos');
  });
});
