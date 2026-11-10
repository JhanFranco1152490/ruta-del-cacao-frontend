import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { getOfflineDb } from '@/lib/offline/db';
import { apiError, buildBuyer } from '@/test/factories';
import { apiUrl, buyersHandler } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useBuyers } from './queries';

const render = <T,>(hook: () => T) => {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(hook, { wrapper });
};

const newUser = () => `buyers-${crypto.randomUUID()}`;

describe('useBuyers', () => {
  it('reads the whole directory of the own producer and keeps a copy', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    const buyers = [buildBuyer(), buildBuyer({ id: 'b2', is_active: false })];
    server.use(buyersHandler(buyers, requests));

    const { result } = render(() => useBuyers(userId, null));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].toString()).toBe('');
    expect(result.current.data?.data.map(({ id }) => id)).toEqual(['b1', 'b2']);
    expect(result.current.data?.savedAt).toBeUndefined();
    const saved = await getOfflineDb(userId).cache.get('buyers');
    expect(saved?.value).toEqual(buyers);
  });

  it('asks for the chosen producer and keeps its copy apart', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(buyersHandler([], requests));

    const { result } = render(() => useBuyers(userId, 'p2'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].get('producer')).toBe('p2');
    expect(
      await getOfflineDb(userId).cache.get('buyers:producer:p2'),
    ).toBeDefined();
  });

  it('shows the saved copy, with its date, when the server does not answer', async () => {
    const userId = newUser();
    await getOfflineDb(userId).cache.put({
      key: 'buyers',
      value: [buildBuyer({ name: 'Acopio La Ceiba' })],
      fetchedAt: 1_700_000_000_000,
    });
    server.use(http.get(apiUrl('/api/buyers'), () => HttpResponse.error()));

    const { result } = render(() => useBuyers(userId, null));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.map(({ name }) => name)).toEqual([
      'Acopio La Ceiba',
    ]);
    expect(result.current.data?.savedAt).toBe(1_700_000_000_000);
  });

  it('does not use the copy for an error of the API', async () => {
    const userId = newUser();
    await getOfflineDb(userId).cache.put({
      key: 'buyers',
      value: [buildBuyer()],
      fetchedAt: 1_700_000_000_000,
    });
    server.use(
      http.get(apiUrl('/api/buyers'), () => apiError(403, 'permission_denied')),
    );

    const { result } = render(() => useBuyers(userId, null));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it('waits for the session before asking', () => {
    const { result } = render(() => useBuyers(undefined, null));

    expect(result.current.fetchStatus).toBe('idle');
  });
});
