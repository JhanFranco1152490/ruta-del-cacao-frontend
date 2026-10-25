import { describe, expect, it } from 'vitest';

import { resolveFarmFilter } from './fermentation-farm';

const options = [
  { id: 'f1', label: 'F01 · La Esperanza', name: 'La Esperanza' },
  { id: 'f2', label: 'F02 · El Mirador', name: 'El Mirador' },
];

describe('resolveFarmFilter', () => {
  it('has no farm when the filter is empty', () => {
    expect(resolveFarmFilter(options, null)).toEqual({
      name: null,
      choice: null,
    });
  });

  it('uses the loaded option of the chosen farm', () => {
    expect(resolveFarmFilter(options, 'f2')).toEqual({
      name: 'El Mirador',
      choice: options[1],
    });
  });

  it('keeps the farm of the address while the options are not loaded', () => {
    expect(resolveFarmFilter([], 'f9')).toEqual({
      name: 'esta finca',
      choice: { id: 'f9', label: 'esta finca' },
    });
  });
});
