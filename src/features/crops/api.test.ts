import { describe, expect, it } from 'vitest';

import { getOfflineDb } from '@/lib/offline/db';
import { readThroughCache } from '@/lib/offline/cached-read';
import {
  buildCacaoVariety,
  buildCharacterizationEvent,
} from '@/test/factories';
import {
  cacaoVarietiesHandler,
  characterizationHistoryHandler,
} from '@/test/handlers';
import { server } from '@/test/server';

import {
  fetchCacaoVarieties,
  fetchCharacterizationHistory,
  toVarietyOption,
} from './api';

describe('fetchCacaoVarieties', () => {
  it('asks for the whole catalog without filters', async () => {
    const requests: URLSearchParams[] = [];
    server.use(cacaoVarietiesHandler([buildCacaoVariety()], requests));

    const varieties = await fetchCacaoVarieties();

    expect(varieties.map((variety) => variety.name)).toEqual(['CCN-51']);
    expect(requests[0].toString()).toBe('');
  });

  it('sends the state and the search when given', async () => {
    const requests: URLSearchParams[] = [];
    server.use(cacaoVarietiesHandler([], requests));

    await fetchCacaoVarieties({ is_active: true, search: 'ccn' });

    expect(requests[0].get('is_active')).toBe('true');
    expect(requests[0].get('search')).toBe('ccn');
  });

  it('keeps the active varieties on the device for the offline form', async () => {
    const userId = `varieties-${crypto.randomUUID()}`;
    server.use(cacaoVarietiesHandler([buildCacaoVariety()]));

    await readThroughCache(userId, 'cacao-varieties:active', () =>
      fetchCacaoVarieties({ is_active: true }),
    );

    const saved = await getOfflineDb(userId).cache.get(
      'cacao-varieties:active',
    );
    expect(saved?.value).toEqual([buildCacaoVariety()]);
  });
});

describe('toVarietyOption', () => {
  it('keeps what the characterization form needs', () => {
    expect(
      toVarietyOption(buildCacaoVariety({ id: 'v1', is_active: false })),
    ).toEqual({ id: 'v1', name: 'CCN-51', isActive: false, commonNames: [] });
  });
});

describe('fetchCharacterizationHistory', () => {
  const events = [3, 2, 1].map((version) =>
    buildCharacterizationEvent({ version }),
  );

  it('asks for the page of the plot, with a fixed size', async () => {
    const requests: URLSearchParams[] = [];
    server.use(characterizationHistoryHandler(events, requests));

    const page = await fetchCharacterizationHistory('pl1', 2);

    expect(requests[0].get('page')).toBe('2');
    expect(requests[0].get('page_size')).toBe('20');
    expect(page.count).toBe(3);
  });

  it('brings the versions of the page, newest first, and whether there are more', async () => {
    server.use(characterizationHistoryHandler(events));

    const page = await fetchCharacterizationHistory('pl1', 1);

    expect(page.results.map((event) => event.version)).toEqual([3, 2, 1]);
    expect(page.next).toBeNull();
  });
});
