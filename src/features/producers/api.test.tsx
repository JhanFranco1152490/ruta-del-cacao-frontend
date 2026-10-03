import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { apiError, buildPage, buildProducer } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import {
  useChangeProducerStatus,
  useCreateProducer,
  useDeleteProducer,
  useMunicipalityName,
  useProducers,
  useUpdateProducer,
} from './api';

function wrapper(client = createTestQueryClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

const PAGE = buildPage([]);
const producer = buildProducer({ version: 4 });
const newProducer = {
  document_type: 'CC',
  identity_document: '1234567',
  first_name: 'Ana',
  last_name: 'Prueba',
  phone: null,
  email: 'ana@example.com',
  municipality_code: '54001',
  joined_on: '2026-03-15',
} as const;

describe('producers api', () => {
  it('builds the list request from the query (only the filters that are set)', async () => {
    let url = '';
    server.use(
      http.get(apiUrl('/api/producers'), ({ request }) => {
        url = request.url;
        return HttpResponse.json(PAGE);
      }),
    );

    const { result } = renderHook(
      () =>
        useProducers({
          search: 'ana',
          status: 'inactive',
          municipality: '54001',
          page: 2,
        }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const params = new URL(url).searchParams;
    expect(Object.fromEntries(params)).toEqual({
      search: 'ana',
      status: 'inactive',
      municipality_code: '54001',
      page: '2',
      page_size: '20',
    });
  });

  it('omits empty filters', async () => {
    let url = '';
    server.use(
      http.get(apiUrl('/api/producers'), ({ request }) => {
        url = request.url;
        return HttpResponse.json(PAGE);
      }),
    );

    const { result } = renderHook(() => useProducers({}), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(Object.fromEntries(new URL(url).searchParams)).toEqual({
      page: '1',
      page_size: '20',
    });
  });

  it('sends the new producer, caches it and invalidates the lists', async () => {
    const client = createTestQueryClient();
    let body: unknown;
    server.use(
      http.post(apiUrl('/api/producers'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(producer, { status: 201 });
      }),
    );
    const { result } = renderHook(() => useCreateProducer(), {
      wrapper: wrapper(client),
    });

    client.setQueryData(queryKeys.producers.list({}), PAGE);
    await act(async () => {
      await result.current.mutateAsync(newProducer);
    });

    expect(body).toEqual(newProducer);
    expect(
      client.getQueryData(queryKeys.producers.detail(producer.id)),
    ).toEqual(producer);
    expect(
      client.getQueryState(queryKeys.producers.list({}))?.isInvalidated,
    ).toBe(true);
  });

  it('sends the expected version with an update and refreshes the cache', async () => {
    const client = createTestQueryClient();
    let body: unknown;
    server.use(
      http.patch(
        apiUrl(`/api/producers/${producer.id}`),
        async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({ ...producer, version: 5 });
        },
      ),
    );
    const { result } = renderHook(() => useUpdateProducer(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        id: producer.id,
        input: { first_name: 'Bea' },
        expectedVersion: 4,
      });
    });

    expect(body).toEqual({ first_name: 'Bea', expected_version: 4 });
    expect(
      client.getQueryData<{ version: number }>(
        queryKeys.producers.detail(producer.id),
      )?.version,
    ).toBe(5);
  });

  it('changes the status with the expected version, caches the result and invalidates the lists', async () => {
    const client = createTestQueryClient();
    const changed = { ...producer, status: 'inactive', version: 5 } as const;
    let body: unknown;
    server.use(
      http.patch(
        apiUrl(`/api/producers/${producer.id}/status`),
        async ({ request }) => {
          body = await request.json();
          return HttpResponse.json(changed);
        },
      ),
    );
    const { result } = renderHook(() => useChangeProducerStatus(), {
      wrapper: wrapper(client),
    });
    client.setQueryData(queryKeys.producers.detail(producer.id), producer);
    client.setQueryData(queryKeys.producers.list({}), PAGE);

    await act(async () => {
      await result.current.mutateAsync({
        id: producer.id,
        status: 'inactive',
        expectedVersion: producer.version,
      });
    });

    expect(body).toEqual({
      status: 'inactive',
      expected_version: producer.version,
    });
    expect(
      client.getQueryData(queryKeys.producers.detail(producer.id)),
    ).toEqual(changed);
    expect(
      client.getQueryState(queryKeys.producers.list({}))?.isInvalidated,
    ).toBe(true);
  });

  describe('after a stale version answer', () => {
    function failWith(status: number, code: string) {
      const client = createTestQueryClient();
      client.setQueryData(queryKeys.producers.detail(producer.id), producer);
      server.use(
        http.patch(apiUrl(`/api/producers/${producer.id}`), () =>
          apiError(status, code, 'Error de prueba.'),
        ),
        http.patch(apiUrl(`/api/producers/${producer.id}/status`), () =>
          apiError(status, code, 'Error de prueba.'),
        ),
      );
      const update = renderHook(() => useUpdateProducer(), {
        wrapper: wrapper(client),
      });
      const change = renderHook(() => useChangeProducerStatus(), {
        wrapper: wrapper(client),
      });
      return { client, update, change };
    }
    const isStale = (client: ReturnType<typeof createTestQueryClient>) =>
      client.getQueryState(queryKeys.producers.detail(producer.id))
        ?.isInvalidated;

    it('invalidates the record when an update is rejected as stale', async () => {
      const { client, update } = failWith(409, 'stale_version');

      await act(async () => {
        await update.result.current
          .mutateAsync({ id: producer.id, input: {}, expectedVersion: 4 })
          .catch(() => undefined);
      });

      expect(isStale(client)).toBe(true);
    });

    it('invalidates the record when a status change is rejected as stale', async () => {
      const { client, change } = failWith(409, 'stale_version');

      await act(async () => {
        await change.result.current
          .mutateAsync({
            id: producer.id,
            status: 'inactive',
            expectedVersion: 4,
          })
          .catch(() => undefined);
      });

      expect(isStale(client)).toBe(true);
    });

    it('leaves the record alone on any other error', async () => {
      const { client, update, change } = failWith(500, 'internal_error');

      await act(async () => {
        await update.result.current
          .mutateAsync({ id: producer.id, input: {}, expectedVersion: 4 })
          .catch(() => undefined);
        await change.result.current
          .mutateAsync({
            id: producer.id,
            status: 'inactive',
            expectedVersion: 4,
          })
          .catch(() => undefined);
      });

      expect(isStale(client)).toBe(false);
    });
  });

  describe('deleting a producer', () => {
    const DELETE = apiUrl(`/api/producers/${producer.id}`);

    function deleteRequests(
      respond = () => new HttpResponse(null, { status: 204 }),
    ) {
      const requests: { version: string | null; body: string }[] = [];
      server.use(
        http.delete(DELETE, async ({ request }) => {
          requests.push({
            version: new URL(request.url).searchParams.get('expected_version'),
            body: await request.text(),
          });
          return respond();
        }),
      );
      return requests;
    }

    it('sends the version in the URL and no body, and forgets the producer and its farms', async () => {
      const requests = deleteRequests();
      const client = createTestQueryClient();
      client.setQueryData(queryKeys.producers.detail(producer.id), producer);
      client.setQueryData(queryKeys.farms.list({}), buildPage([]));
      const { result } = renderHook(() => useDeleteProducer(), {
        wrapper: wrapper(client),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: producer.id,
          expectedVersion: 4,
        });
      });

      expect(requests).toEqual([{ version: '4', body: '' }]);
      expect(
        client.getQueryData(queryKeys.producers.detail(producer.id)),
      ).toBeUndefined();
      expect(
        client.getQueryState(queryKeys.farms.list({}))?.isInvalidated,
      ).toBe(true);
    });

    it('fails at once without a connection and is never sent later on its own', async () => {
      const requests = deleteRequests(() => HttpResponse.error());
      onlineManager.setOnline(false);
      try {
        const { result } = renderHook(() => useDeleteProducer(), {
          wrapper: wrapper(),
        });

        await act(async () => {
          await result.current
            .mutateAsync({ id: producer.id, expectedVersion: 4 })
            .catch(() => undefined);
        });

        expect(result.current.isError).toBe(true);
      } finally {
        onlineManager.setOnline(true);
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(requests).toHaveLength(1);
    });
  });

  it('resolves municipality names and falls back to a dash for unknown codes', async () => {
    server.use(
      http.get(apiUrl('/api/catalogs/municipalities'), () =>
        HttpResponse.json({ results: [{ code: '54001', name: 'Cúcuta' }] }),
      ),
    );
    const { result } = renderHook(() => useMunicipalityName(), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current('54001')).toBe('Cúcuta'));
    expect(result.current('99999')).toBe('—');
  });
});
