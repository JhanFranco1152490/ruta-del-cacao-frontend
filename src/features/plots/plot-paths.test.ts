import { describe, expect, it } from 'vitest';

import { plotEditPath, plotNewPath } from './plot-paths';

describe('plot paths', () => {
  it('passes the farm to the fixed route for a new plot', () => {
    expect(plotNewPath('f 1')).toBe('/fincas/parcelas/nueva?finca=f+1');
  });

  it('passes the plot and its farm to the fixed route for editing', () => {
    expect(plotEditPath('p1', 'f1')).toBe(
      '/fincas/parcelas/editar?id=p1&finca=f1',
    );
  });
});
