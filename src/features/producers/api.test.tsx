import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { buildPage, buildProducer } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import {
  useChangeProducerStatus,
  useCreateProducer,
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
  email: null,
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

  it('caches the created producer and invalidates the lists', async () => {
    const client = createTestQueryClient();
    server.use(
      http.post(apiUrl('/api/producers'), () =>
        HttpResponse.json(producer, { status: 201 }),
      ),
    );
    const { result } = renderHook(() => useCreateProducer(), {
      wrapper: wrapper(client),
    });

    client.setQueryData(['producers', 'list', {}], PAGE);
    await act(async () => {
      await result.current.mutateAsync(newProducer);
    });

    expect(client.getQueryData(['producers', 'detail', 'p1'])).toEqual(
      producer,
    );
    expect(client.getQueryState(['producers', 'list', {}])?.isInvalidated).toBe(
      true,
    );
  });

  it('sends the expected version with an update and refreshes the cache', async () => {
    const client = createTestQueryClient();
    let body: unknown;
    server.use(
      http.patch(apiUrl('/api/producers/p1'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...producer, version: 5 });
      }),
    );
    const { result } = renderHook(() => useUpdateProducer(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        id: 'p1',
        input: { first_name: 'Bea' },
        expectedVersion: 4,
      });
    });

    expect(body).toEqual({ first_name: 'Bea', expected_version: 4 });
    expect(
      client.getQueryData<{ version: number }>(['producers', 'detail', 'p1'])
        ?.version,
    ).toBe(5);
  });

  it('changes the status with the expected version', async () => {
    let body: unknown;
    server.use(
      http.patch(apiUrl('/api/producers/p1/status'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...producer, status: 'inactive' });
      }),
    );
    const { result } = renderHook(() => useChangeProducerStatus(), {
      wrapper: wrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        id: 'p1',
        status: 'inactive',
        expectedVersion: 4,
      });
    });

    expect(body).toEqual({ status: 'inactive', expected_version: 4 });
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
