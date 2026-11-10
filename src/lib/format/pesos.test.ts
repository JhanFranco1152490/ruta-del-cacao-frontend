import { describe, expect, it } from 'vitest';

import { formatPesos } from './pesos';

describe('formatPesos', () => {
  it('writes whole pesos with a point every three digits', () => {
    expect(formatPesos(4567500)).toBe('$ 4.567.500');
    expect(formatPesos(1500)).toBe('$ 1.500');
    expect(formatPesos(999)).toBe('$ 999');
    expect(formatPesos(0)).toBe('$ 0');
  });

  it('separates the sign with a plain space', () => {
    expect(formatPesos(18500).charAt(1)).toBe(' ');
  });
});
