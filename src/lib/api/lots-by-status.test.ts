import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { buildLot, buildPage } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import { fetchLotsByStatus } from './lots-by-status';

describe('fetchLotsByStatus', () => {
  it('asks for the status and the producer and reads page after page', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      http.get(apiUrl('/api/lots'), ({ request }) => {
        const params = new URL(request.url).searchParams;
        requests.push(params);
        const page = Number(params.get('page') ?? '1');
        return HttpResponse.json(
          buildPage([buildLot({ id: `l${page}` })], 101),
        );
      }),
    );

    const lots = await fetchLotsByStatus('fermented', 'p2');

    expect(lots.map(({ id }) => id)).toEqual(['l1', 'l2']);
    expect(requests.map((params) => params.get('page'))).toEqual([null, '2']);
    expect(requests[0].get('status')).toBe('fermented');
    expect(requests[0].get('producer')).toBe('p2');
    expect(requests[0].get('page_size')).toBe('100');
  });
});
