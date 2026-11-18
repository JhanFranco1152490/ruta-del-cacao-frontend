import { describe, expect, it } from 'vitest';

import { buildLot } from '@/test/factories';
import { lotsHandler } from '@/test/handlers';
import { server } from '@/test/server';

import { fetchLotOptions, LOT_SEARCH_SIZE } from './lot-options';

const ANY = { search: '', farm: null, plot: null, producer: null };

describe('fetchLotOptions', () => {
  it('searches the lots by code within the chosen farm and plot', async () => {
    const requests: URLSearchParams[] = [];
    server.use(lotsHandler([], requests));

    await fetchLotOptions({
      search: ' 0001 ',
      farm: 'f1',
      plot: 'pl1',
      producer: null,
    });

    expect(requests[0].get('search')).toBe('0001');
    expect(requests[0].get('farm')).toBe('f1');
    expect(requests[0].get('plot')).toBe('pl1');
    expect(requests[0].get('page_size')).toBe(String(LOT_SEARCH_SIZE));
    expect(requests[0].has('producer')).toBe(false);
  });

  it('sends nothing that is not chosen', async () => {
    const requests: URLSearchParams[] = [];
    server.use(lotsHandler([], requests));

    await fetchLotOptions(ANY);

    expect([...requests[0].keys()]).toEqual(['page_size']);
  });

  it('returns each lot by its id and its code', async () => {
    server.use(
      lotsHandler([buildLot({ id: 'l1', code: '000001-F01-P01-260203-1' })]),
    );

    await expect(fetchLotOptions(ANY)).resolves.toEqual([
      { id: 'l1', code: '000001-F01-P01-260203-1' },
    ]);
  });
});
