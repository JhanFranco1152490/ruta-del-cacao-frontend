import { describe, expect, it } from 'vitest';

import { buildPlot } from '@/test/factories';
import { plotsHandler } from '@/test/handlers';
import { server } from '@/test/server';

import { fetchPlotOptions } from './plot-options';

describe('fetchPlotOptions', () => {
  it('asks for every plot of the farm and keeps what a form needs', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      plotsHandler(
        [
          buildPlot({ id: 'pl1', code: 'P-01', area_hectares: '2.40' }),
          buildPlot({ id: 'pl2', code: 'P-02', is_active: false }),
        ],
        requests,
      ),
    );

    const options = await fetchPlotOptions('f1');

    expect(requests[0].get('farm')).toBe('f1');
    expect(requests[0].get('page_size')).toBe('100');
    expect(options).toEqual([
      { id: 'pl1', code: 'P-01', areaHectares: '2.40', isActive: true },
      { id: 'pl2', code: 'P-02', areaHectares: '2.40', isActive: false },
    ]);
  });
});
