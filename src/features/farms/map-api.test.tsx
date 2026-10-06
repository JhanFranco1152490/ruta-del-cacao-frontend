import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { farmMapCountsHandler, farmMapPointsHandler } from '@/test/handlers';
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

afterEach(() => vi.useRealTimers());

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
