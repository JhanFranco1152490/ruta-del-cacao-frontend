import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { getOfflineDb } from '@/lib/offline/db';
import { apiError, buildDrying, buildPage, buildLot } from '@/test/factories';
import { apiUrl, dryingsHandler } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import {
  useDeleteLog,
  useDrying,
  useDryings,
  useFinishDrying,
  useReadyLots,
} from './api';

function wrapperFor(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const render = <T,>(hook: () => T) =>
  renderHook(hook, { wrapper: wrapperFor(createTestQueryClient()) });

const newUser = () => `drying-${crypto.randomUUID()}`;

describe('useDryings', () => {
  it('reads the dryings in progress of the own producer and keeps a copy', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(dryingsHandler([buildDrying()], requests));

    const { result } = render(() => useDryings(userId, null));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].toString()).toBe('');
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.savedAt).toBeUndefined();
    const saved = await getOfflineDb(userId).cache.get('drying');
    expect(saved?.value).toEqual([buildDrying()]);
  });

  it('asks for the chosen producer and keeps its copy apart', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(dryingsHandler([], requests));

    const { result } = render(() => useDryings(userId, 'p2'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].get('producer')).toBe('p2');
    expect(
      await getOfflineDb(userId).cache.get('drying:producer:p2'),
    ).toBeDefined();
  });

  it('shows the saved copy, with its date, when the server does not answer', async () => {
    const userId = newUser();
    await getOfflineDb(userId).cache.put({
      key: 'drying',
      value: [buildDrying({ started_at: '2026-10-14T06:00:00-05:00' })],
      fetchedAt: 1_700_000_000_000,
    });
    server.use(http.get(apiUrl('/api/drying'), () => HttpResponse.error()));

    const { result } = render(() => useDryings(userId, null));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      result.current.data?.data.map(({ started_at }) => started_at),
    ).toEqual(['2026-10-14T06:00:00-05:00']);
    expect(result.current.data?.savedAt).toBe(1_700_000_000_000);
  });

  it('does not use the copy for an error of the API', async () => {
    const userId = newUser();
    await getOfflineDb(userId).cache.put({
      key: 'drying',
      value: [buildDrying()],
      fetchedAt: 1_700_000_000_000,
    });
    server.use(
      http.get(apiUrl('/api/drying'), () => apiError(403, 'permission_denied')),
    );

    const { result } = render(() => useDryings(userId, null));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it('waits for the session, and for the producer when asked to', () => {
    const { result: noSession } = render(() => useDryings(undefined, null));
    const { result: disabled } = render(() =>
      useDryings(newUser(), null, { enabled: false }),
    );

    expect(noSession.current.fetchStatus).toBe('idle');
    expect(disabled.current.fetchStatus).toBe('idle');
  });
});

describe('useReadyLots', () => {
  it('reads the fermented lots of the chosen producer', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      http.get(apiUrl('/api/lots'), ({ request }) => {
        requests.push(new URL(request.url).searchParams);
        return HttpResponse.json(buildPage([buildLot({ id: 'l1' })]));
      }),
    );

    const { result } = render(() => useReadyLots('p2'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].get('status')).toBe('fermented');
    expect(requests[0].get('producer')).toBe('p2');
    expect(result.current.data?.map(({ id }) => id)).toEqual(['l1']);
  });

  it('does not ask when it is not needed', () => {
    const { result } = render(() => useReadyLots(null, { enabled: false }));

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useDrying', () => {
  it('reads the drying of a lot', async () => {
    server.use(
      http.get(apiUrl('/api/drying/l1'), () =>
        HttpResponse.json(buildDrying()),
      ),
    );

    const { result } = render(() => useDrying('l1', newUser()));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.facility.name).toBe('M-01');
    expect(result.current.data?.savedAt).toBeUndefined();
  });

  it('takes it from the copy of the list without a connection', async () => {
    const userId = newUser();
    await getOfflineDb(userId).cache.put({
      key: 'drying',
      value: [buildDrying()],
      fetchedAt: 1_760_000_000_000,
    });
    server.use(http.get(apiUrl('/api/drying/l1'), () => HttpResponse.error()));

    const { result } = render(() => useDrying('l1', userId));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.savedAt).toBe(1_760_000_000_000);
  });

  it('does not ask when the lot has no drying', () => {
    const { result } = render(() =>
      useDrying('l1', newUser(), { enabled: false }),
    );

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('writes', () => {
  it('sends the version read in the URL when deleting a log', async () => {
    const requests: URL[] = [];
    server.use(
      http.delete(apiUrl('/api/drying/l1/logs/g1'), ({ request }) => {
        requests.push(new URL(request.url));
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { result } = render(() => useDeleteLog('l1'));
    await act(() => result.current.mutateAsync({ logId: 'g1', version: 3 }));

    expect(requests[0].searchParams.get('expected_version')).toBe('3');
  });

  it('finishes the drying with the version read', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(apiUrl('/api/drying/l1/finish'), async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(buildDrying());
      }),
    );

    const { result } = render(() => useFinishDrying('l1'));
    const body = {
      expected_version: 2,
      ended_at: '2026-10-27T10:00:00-05:00',
      final_moisture_pct: '7.0',
      dry_weight_kg: '28.5',
    };
    await act(() => result.current.mutateAsync(body));

    expect(bodies).toEqual([body]);
  });
});
