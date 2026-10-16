import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { getOfflineDb } from '@/lib/offline/db';
import { apiError, buildCollector, buildHarvest } from '@/test/factories';
import {
  apiUrl,
  harvestCollectorsHandler,
  harvestsHandler,
} from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useHarvest, useHarvestCollectors, useHarvestsOfMonth } from './api';

function wrapperFor(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const render = <T,>(hook: () => T) =>
  renderHook(hook, { wrapper: wrapperFor(createTestQueryClient()) });

const newUser = () => `harvests-${crypto.randomUUID()}`;

// Un fetch que no recibe respuesta, como sin red.
const offline = (path: string) =>
  http.get(apiUrl(path), () => HttpResponse.error());

const save = (
  userId: string,
  key: string,
  value: unknown[],
  fetchedAt = 1_700_000_000_000,
) => getOfflineDb(userId).cache.put({ key, value, fetchedAt });

describe('useHarvestsOfMonth', () => {
  it('asks for the whole month and keeps a copy of it', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(harvestsHandler([buildHarvest()], requests));

    const { result } = render(() =>
      useHarvestsOfMonth(userId, '2026-10', null),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].toString()).toBe('from=2026-10-01&to=2026-10-31');
    expect(result.current.data?.data.map(({ id }) => id)).toEqual(['h1']);
    const saved = await getOfflineDb(userId).cache.get('harvests:2026-10');
    expect(saved?.value).toEqual([buildHarvest()]);
  });

  it('asks for the chosen producer and keeps its copy apart', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(harvestsHandler([], requests));

    const { result } = render(() =>
      useHarvestsOfMonth(userId, '2026-10', 'p2'),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].get('producer')).toBe('p2');
    expect(
      await getOfflineDb(userId).cache.get('harvests:producer:p2:2026-10'),
    ).toBeDefined();
  });

  describe('the months kept for the field', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-09T15:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const cached = (userId: string) =>
      getOfflineDb(userId)
        .cache.toArray()
        .then((rows) => rows.map(({ key }) => key).sort());

    it('also keeps the month before the current one', async () => {
      const userId = newUser();
      server.use(harvestsHandler([]));

      const { result } = render(() =>
        useHarvestsOfMonth(userId, '2026-10', null),
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      await waitFor(async () =>
        expect(await cached(userId)).toEqual([
          'harvests:2026-09',
          'harvests:2026-10',
        ]),
      );
    });

    it('keeps the month being viewed even when it is outside of them', async () => {
      const userId = newUser();
      server.use(harvestsHandler([]));

      const { result } = render(() =>
        useHarvestsOfMonth(userId, '2026-06', null),
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      await waitFor(async () =>
        expect(await cached(userId)).toEqual([
          'harvests:2026-06',
          'harvests:2026-09',
          'harvests:2026-10',
        ]),
      );
    });
  });

  it('falls back to the saved month, with its date, without a network', async () => {
    const userId = newUser();
    await save(userId, 'harvests:2026-10', [buildHarvest()]);
    server.use(offline('/api/harvests'));

    const { result } = render(() =>
      useHarvestsOfMonth(userId, '2026-10', null),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.savedAt).toBe(1_700_000_000_000);
    expect(result.current.data?.data).toHaveLength(1);
  });

  it('fails without a network for a month that was never loaded', async () => {
    const userId = newUser();
    server.use(offline('/api/harvests'));

    const { result } = render(() =>
      useHarvestsOfMonth(userId, '2027-03', null),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).not.toBeInstanceOf(ApiError);
  });

  it('shows an error of the api instead of the saved copy', async () => {
    const userId = newUser();
    await save(userId, 'harvests:2026-10', [buildHarvest()]);
    server.use(
      http.get(apiUrl('/api/harvests'), () =>
        apiError(403, 'permission_denied', 'No tienes permiso.'),
      ),
    );

    const { result } = render(() =>
      useHarvestsOfMonth(userId, '2026-10', null),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});

describe('useHarvest', () => {
  it('reads one harvest by its id', async () => {
    server.use(
      http.get(apiUrl('/api/harvests/h1'), () =>
        HttpResponse.json(buildHarvest()),
      ),
    );

    const { result } = render(() => useHarvest(newUser(), 'h1'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.id).toBe('h1');
    expect(result.current.data?.savedAt).toBeUndefined();
  });

  it('finds it in the newest saved month without a network', async () => {
    const userId = newUser();
    await save(userId, 'harvests:2026-09', [buildHarvest({ version: 1 })], 1);
    await save(userId, 'harvests:2026-10', [buildHarvest({ version: 2 })], 2);
    server.use(offline('/api/harvests/h1'));

    const { result } = render(() => useHarvest(userId, 'h1'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      data: { version: 2 },
      savedAt: 2,
    });
  });

  it('says that the harvest does not exist instead of using a copy', async () => {
    const userId = newUser();
    await save(userId, 'harvests:2026-10', [buildHarvest()]);
    server.use(
      http.get(apiUrl('/api/harvests/h1'), () =>
        apiError(404, 'not_found', 'No encontrado.'),
      ),
    );

    const { result } = render(() => useHarvest(userId, 'h1'));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});

describe('useHarvestCollectors', () => {
  it('reads the accounts of the own producer and keeps a copy', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(harvestCollectorsHandler([buildCollector()], requests));

    const { result } = render(() => useHarvestCollectors(userId, null));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].toString()).toBe('');
    expect(
      (await getOfflineDb(userId).cache.get('harvest-collectors'))?.value,
    ).toEqual([buildCollector()]);
  });

  it('asks for the chosen producer and keeps its copy apart', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(harvestCollectorsHandler([], requests));

    const { result } = render(() => useHarvestCollectors(userId, 'p2'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].get('producer')).toBe('p2');
    expect(
      await getOfflineDb(userId).cache.get('harvest-collectors:producer:p2'),
    ).toBeDefined();
  });

  it('asks for nothing while it is turned off', () => {
    const requests: URLSearchParams[] = [];
    server.use(harvestCollectorsHandler([], requests));

    render(() => useHarvestCollectors(newUser(), null, { enabled: false }));

    expect(requests).toEqual([]);
  });
});
