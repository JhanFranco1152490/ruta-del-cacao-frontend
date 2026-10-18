import { describe, expect, it } from 'vitest';

import { buildPlot } from '@/test/factories';
import { plotsHandler } from '@/test/handlers';
import { server } from '@/test/server';

import { fetchPlotOptions } from './plot-options';

const PRODUCER = {
  id: 'p1',
  member_code: 'PROD-000007',
  first_name: 'Ana',
  last_name: 'Prueba',
};

describe('fetchPlotOptions', () => {
  it('asks for the active plots, grouped by producer and farm, up to one page', async () => {
    const requests: URLSearchParams[] = [];
    server.use(plotsHandler([], requests));

    await fetchPlotOptions({});

    expect(requests[0].get('is_active')).toBe('true');
    expect(requests[0].get('ordering')).toBe('producer,farm,code');
    expect(requests[0].get('page_size')).toBe('100');
    expect(requests[0].has('farm')).toBe(false);
    expect(requests[0].has('producer')).toBe(false);
  });

  it('narrows the plots to a farm or to a producer', async () => {
    const requests: URLSearchParams[] = [];
    server.use(plotsHandler([], requests));

    await fetchPlotOptions({ farm: 'f1' });
    await fetchPlotOptions({ producer: 'p1' });

    expect(requests[0].get('farm')).toBe('f1');
    expect(requests[1].get('producer')).toBe('p1');
  });

  it('keeps what a form needs, with the farm and producer each plot belongs to', async () => {
    server.use(
      plotsHandler([
        buildPlot({ id: 'pl1', code: 'P-01', area_hectares: '2.40' }),
        buildPlot({
          id: 'pl2',
          code: 'P-02',
          farm: {
            id: 'f2',
            code: 'F02',
            name: 'El Retiro',
            is_active: false,
            producer: PRODUCER,
          },
        }),
      ]),
    );

    const { options, count } = await fetchPlotOptions({});

    expect(count).toBe(2);
    expect(options).toEqual([
      {
        id: 'pl1',
        code: 'P-01',
        name: null,
        areaHectares: '2.40',
        isActive: true,
        farm: {
          id: 'f1',
          code: 'F01',
          name: 'La Esperanza',
          isActive: true,
          producer: PRODUCER,
        },
      },
      {
        id: 'pl2',
        code: 'P-02',
        name: null,
        areaHectares: '2.40',
        isActive: true,
        farm: {
          id: 'f2',
          code: 'F02',
          name: 'El Retiro',
          isActive: false,
          producer: PRODUCER,
        },
      },
    ]);
  });
});
