import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { buildFarm } from '@/test/factories';
import { apiUrl, farmsHandler } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useChangeFarmStatus, useFarmOptions } from './api';

describe('useChangeFarmStatus', () => {
  it('refreshes every read of the farm, not only the list', async () => {
    const queryClient = createTestQueryClient();
    const detailView = queryKeys.farms.detailView('f1');
    const mapCounts = queryKeys.farms.mapCounts({});
    queryClient.setQueryData(detailView, { data: buildFarm() });
    queryClient.setQueryData(mapCounts, []);
    server.use(
      http.patch(apiUrl('/api/farms/f1'), () =>
        HttpResponse.json(buildFarm({ is_active: false, version: 3 })),
      ),
    );
    const { result } = renderHook(() => useChangeFarmStatus(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    await act(() =>
      result.current.mutateAsync({
        id: 'f1',
        isActive: false,
        expectedVersion: 2,
      }),
    );

    await waitFor(() => {
      expect(queryClient.getQueryState(detailView)?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(mapCounts)?.isInvalidated).toBe(true);
    });
  });
});

describe('useFarmOptions', () => {
  const wrapper = (queryClient = createTestQueryClient()) =>
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    };

  it('asks for every farm of the producer in one page and keeps a slim copy', async () => {
    const userId = `farm-options-${crypto.randomUUID()}`;
    const requests: URLSearchParams[] = [];
    server.use(
      farmsHandler(
        [buildFarm({ id: 'f1', name: 'La Esperanza', is_active: false })],
        requests,
      ),
    );

    const { result } = renderHook(() => useFarmOptions(userId, 'p2'), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].get('producer')).toBe('p2');
    expect(requests[0].get('page_size')).toBe('100');
    const slim = [{ id: 'f1', name: 'La Esperanza', is_active: false }];
    expect(result.current.data?.data).toEqual(slim);
    const saved = await getOfflineDb(userId).cache.get(
      'farm-options:producer:p2',
    );
    expect(saved?.value).toEqual(slim);
  });

  it('reads the own farms without a producer', async () => {
    const requests: URLSearchParams[] = [];
    server.use(farmsHandler([], requests));

    const { result } = renderHook(
      () => useFarmOptions(`farm-options-${crypto.randomUUID()}`, null),
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].has('producer')).toBe(false);
  });
});
