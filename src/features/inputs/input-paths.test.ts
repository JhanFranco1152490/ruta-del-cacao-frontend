import { describe, expect, it } from 'vitest';

import { inputMovementsPath } from './input-paths';

describe('inputMovementsPath', () => {
  it('passes the input and the farm as parameters of a fixed route', () => {
    expect(inputMovementsPath('in1', 'f1')).toBe(
      '/insumos/movimientos?id=in1&finca=f1',
    );
  });
});
