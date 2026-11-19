import { describe, expect, it } from 'vitest';

import { lotDetailPath, lotHistoryPath } from './lots';

describe('lot paths', () => {
  it('opens the history of a lot with its id in the address', () => {
    expect(lotHistoryPath('l1')).toBe('/lotes/historia?id=l1');
  });

  it('escapes the id like the detail', () => {
    expect(lotHistoryPath('a b')).toBe('/lotes/historia?id=a+b');
    expect(lotDetailPath('a b')).toBe('/lotes/detalle?id=a+b');
  });
});
