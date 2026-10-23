import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { getOfflineDb } from '@/lib/offline/db';
import {
  apiError,
  buildFermentation,
  buildLot,
  buildPage,
} from '@/test/factories';
import { apiUrl, fermentationsHandler } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useFermentation, useFermentations, useReadyLots } from './api';

function wrapperFor(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const render = <T,>(hook: () => T) =>
  renderHook(hook, { wrapper: wrapperFor(createTestQueryClient()) });

const newUser = () => `fermentation-${crypto.randomUUID()}`;

describe('useFermentations', () => {
  it('reads the fermentations in progress of the own producer and keeps a copy', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(fermentationsHandler([buildFermentation()], requests));

    const { result } = render(() => useFermentations(userId, null));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].toString()).toBe('');
    expect(result.current.data?.data.map(({ lot }) => lot.id)).toEqual(['l1']);
    expect(result.current.data?.savedAt).toBeUndefined();
    const saved = await getOfflineDb(userId).cache.get('fermentation');
    expect(saved?.value).toEqual([buildFermentation()]);
  });

  it('asks for the chosen producer and keeps its copy apart', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(fermentationsHandler([], requests));

    const { result } = render(() => useFermentations(userId, 'p2'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].get('producer')).toBe('p2');
    expect(
      await getOfflineDb(userId).cache.get('fermentation:producer:p2'),
    ).toBeDefined();
  });

  it('shows the saved copy, with its date, when the server does not answer', async () => {
    const userId = newUser();
    await getOfflineDb(userId).cache.put({
      key: 'fermentation',
      value: [buildFermentation({ started_at: '2026-10-14T06:00:00-05:00' })],
      fetchedAt: 1_700_000_000_000,
    });
    server.use(
      http.get(apiUrl('/api/fermentation'), () => HttpResponse.error()),
    );

    const { result } = render(() => useFermentations(userId, null));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      result.current.data?.data.map(({ started_at }) => started_at),
    ).toEqual(['2026-10-14T06:00:00-05:00']);
    expect(result.current.data?.savedAt).toBe(1_700_000_000_000);
  });

  it('does not use the copy for an error of the API', async () => {
    const userId = newUser();
    await getOfflineDb(userId).cache.put({
      key: 'fermentation',
      value: [buildFermentation()],
      fetchedAt: 1_700_000_000_000,
    });
    server.use(
      http.get(apiUrl('/api/fermentation'), () =>
        apiError(403, 'permission_denied'),
      ),
    );

    const { result } = render(() => useFermentations(userId, null));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it('waits for the session, and for the producer when asked to', () => {
    const { result: noSession } = render(() =>
      useFermentations(undefined, null),
    );
    const { result: disabled } = render(() =>
      useFermentations(newUser(), null, { enabled: false }),
    );

    expect(noSession.current.fetchStatus).toBe('idle');
    expect(disabled.current.fetchStatus).toBe('idle');
  });
});

describe('useReadyLots', () => {
  it('reads every generated lot, page after page', async () => {
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

    const { result } = render(() => useReadyLots(null));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests.map((params) => params.get('page') ?? '1')).toEqual([
      '1',
      '2',
    ]);
    expect(requests[0].get('status')).toBe('generated');
    expect(requests[0].get('page_size')).toBe('100');
    expect(result.current.data?.map(({ id }) => id)).toEqual(['l1', 'l2']);
  });

  it('asks for the chosen producer', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      http.get(apiUrl('/api/lots'), ({ request }) => {
        requests.push(new URL(request.url).searchParams);
        return HttpResponse.json(buildPage([]));
      }),
    );

    const { result } = render(() => useReadyLots('p2'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].get('producer')).toBe('p2');
  });

  it('does not ask when it is not needed', () => {
    const { result } = render(() => useReadyLots(null, { enabled: false }));

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useFermentation', () => {
  it('reads the fermentation of a lot', async () => {
    server.use(
      http.get(apiUrl('/api/fermentation/l1'), () =>
        HttpResponse.json(buildFermentation()),
      ),
    );

    const { result } = render(() => useFermentation('l1'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.facility.name).toBe('C-01');
  });

  it('does not ask when the lot has no fermentation', () => {
    const { result } = render(() => useFermentation('l1', { enabled: false }));

    expect(result.current.fetchStatus).toBe('idle');
  });
});
