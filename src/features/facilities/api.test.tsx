import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { apiError, buildFacility } from '@/test/factories';
import { apiUrl, csrfHandler, facilitiesHandler } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useCreateFacility, useFacilities, useUpdateFacility } from './api';

function wrapperFor(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const render = <T,>(hook: () => T) =>
  renderHook(hook, { wrapper: wrapperFor(createTestQueryClient()) });

const newUser = () => `facilities-${crypto.randomUUID()}`;

const PATH = '/api/postharvest-facilities';

describe('useFacilities', () => {
  it('reads every facility of the own producer and keeps a copy', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(facilitiesHandler([buildFacility()], requests));

    const { result } = render(() => useFacilities(userId, null));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].toString()).toBe('');
    expect(result.current.data?.data.map(({ id }) => id)).toEqual(['fc1']);
    expect(result.current.data?.savedAt).toBeUndefined();
    const saved = await getOfflineDb(userId).cache.get(
      'postharvest-facilities',
    );
    expect(saved?.value).toEqual([buildFacility()]);
  });

  it('asks for the chosen producer and keeps its copy apart', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(facilitiesHandler([], requests));

    const { result } = render(() => useFacilities(userId, 'p2'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].get('producer')).toBe('p2');
    expect(
      await getOfflineDb(userId).cache.get(
        'postharvest-facilities:producer:p2',
      ),
    ).toBeDefined();
  });

  it('shows the saved copy, with its date, when the server does not answer', async () => {
    const userId = newUser();
    await getOfflineDb(userId).cache.put({
      key: 'postharvest-facilities',
      value: [buildFacility({ name: 'C-09' })],
      fetchedAt: 1_700_000_000_000,
    });
    server.use(http.get(apiUrl(PATH), () => HttpResponse.error()));

    const { result } = render(() => useFacilities(userId, null));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.map(({ name }) => name)).toEqual(['C-09']);
    expect(result.current.data?.savedAt).toBe(1_700_000_000_000);
  });

  it('does not use the copy for an error of the API', async () => {
    const userId = newUser();
    await getOfflineDb(userId).cache.put({
      key: 'postharvest-facilities',
      value: [buildFacility()],
      fetchedAt: 1_700_000_000_000,
    });
    server.use(
      http.get(apiUrl(PATH), () => apiError(403, 'permission_denied')),
    );

    const { result } = render(() => useFacilities(userId, null));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it('waits for the session before asking', () => {
    const { result } = render(() => useFacilities(undefined, null));

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('writing a facility', () => {
  function renderWithClient<T>(hook: () => T) {
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    return {
      invalidate,
      ...renderHook(hook, { wrapper: wrapperFor(queryClient) }),
    };
  }

  it('registers one and refreshes the list', async () => {
    const bodies: unknown[] = [];
    server.use(
      csrfHandler,
      http.post(apiUrl(PATH), async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(buildFacility(), { status: 201 });
      }),
    );
    const { result, invalidate } = renderWithClient(() => useCreateFacility());

    await result.current.mutateAsync({
      farm_id: 'f1',
      facility_type: 'fermentation_box',
      name: 'C-04',
      capacity_kg: '600',
    });

    expect(bodies).toEqual([
      {
        farm_id: 'f1',
        facility_type: 'fermentation_box',
        name: 'C-04',
        capacity_kg: '600',
      },
    ]);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.facilities.all(),
    });
  });

  it('edits one with the version read, and refreshes the list even when it fails', async () => {
    const bodies: unknown[] = [];
    server.use(
      csrfHandler,
      http.patch(apiUrl(`${PATH}/fc1`), async ({ request }) => {
        bodies.push(await request.json());
        return apiError(409, 'stale_version');
      }),
    );
    const { result, invalidate } = renderWithClient(() => useUpdateFacility());

    await expect(
      result.current.mutateAsync({
        id: 'fc1',
        body: { name: 'C-05', expected_version: 3 },
      }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(bodies).toEqual([{ name: 'C-05', expected_version: 3 }]);
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: queryKeys.facilities.all(),
      }),
    );
  });
});
