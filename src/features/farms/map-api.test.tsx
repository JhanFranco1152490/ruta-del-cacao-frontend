import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { syncActingProducer, writeActingProducer } from '@/lib/acting-producer';

import {
  apiUrl,
  farmMapCountsHandler,
  farmMapPointsHandler,
} from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useFarmMapPoints, useFarmMunicipalityCounts } from './map-api';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

const someone = () => `map-${crypto.randomUUID()}`;

afterEach(() => {
  vi.useRealTimers();
  sessionStorage.clear();
  syncActingProducer(null);
});

describe('farm map data', () => {
  it('asks the server again for the municipality counts every two minutes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const requests: URLSearchParams[] = [];
    server.use(farmMapCountsHandler([], requests));
    renderHook(() => useFarmMunicipalityCounts(someone(), {}), { wrapper });
    await waitFor(() => expect(requests).toHaveLength(1));

    await vi.advanceTimersByTimeAsync(120_000);

    await waitFor(() => expect(requests.length).toBeGreaterThan(1));
  });

  it('asks the server again for the map points every two minutes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const requests: URLSearchParams[] = [];
    server.use(farmMapPointsHandler([], requests));
    renderHook(() => useFarmMapPoints(someone(), null, {}), { wrapper });
    await waitFor(() => expect(requests).toHaveLength(1));

    await vi.advanceTimersByTimeAsync(120_000);

    await waitFor(() => expect(requests.length).toBeGreaterThan(1));
  });
});

describe('farm map copies for the technical account', () => {
  const FIRST = '33333333-3333-4333-8333-333333333333';
  const SECOND = '44444444-4444-4444-8444-444444444444';

  it('does not show the saved copy of one producer under another when the server does not answer', async () => {
    const userId = someone();
    const counts = [{ municipality_id: '54001', farm_count: 3 }];
    writeActingProducer(userId, FIRST);
    server.use(farmMapCountsHandler(counts));
    const first = renderHook(() => useFarmMunicipalityCounts(userId, {}), {
      wrapper,
    });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));

    writeActingProducer(userId, SECOND);
    server.use(
      http.get(apiUrl('/api/farms/map/municipalities'), () =>
        HttpResponse.error(),
      ),
    );
    const second = renderHook(() => useFarmMunicipalityCounts(userId, {}), {
      wrapper,
    });

    await waitFor(() => expect(second.result.current.isError).toBe(true));
  });

  it('still shows its own saved copy when the server does not answer', async () => {
    const userId = someone();
    const counts = [{ municipality_id: '54001', farm_count: 3 }];
    writeActingProducer(userId, FIRST);
    server.use(farmMapCountsHandler(counts));
    const online = renderHook(() => useFarmMunicipalityCounts(userId, {}), {
      wrapper,
    });
    await waitFor(() => expect(online.result.current.isSuccess).toBe(true));

    server.use(
      http.get(apiUrl('/api/farms/map/municipalities'), () =>
        HttpResponse.error(),
      ),
    );
    const offline = renderHook(() => useFarmMunicipalityCounts(userId, {}), {
      wrapper,
    });

    await waitFor(() =>
      expect(offline.result.current.data?.data).toEqual(counts),
    );
  });
});
