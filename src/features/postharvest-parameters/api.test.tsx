import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { getOfflineDb } from '@/lib/offline/db';
import { apiError, buildParameters } from '@/test/factories';
import { apiUrl, csrfHandler, parametersHandler } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useParameters, useResetParameters, useSaveParameters } from './api';
import { toParameterValues } from './parameters-form';
import { parametersFormOf } from './parameters-form';

function wrapperFor(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const render = <T,>(hook: () => T) =>
  renderHook(hook, { wrapper: wrapperFor(createTestQueryClient()) });

const newUser = () => `parameters-${crypto.randomUUID()}`;
const PATH = '/api/postharvest-parameters';

describe('useParameters', () => {
  it('reads the parameters of the own producer and keeps a copy', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(parametersHandler(buildParameters(), requests));

    const { result } = render(() => useParameters(userId, null));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].toString()).toBe('');
    expect(result.current.data?.data.is_default).toBe(true);
    expect(result.current.data?.savedAt).toBeUndefined();
    const saved = await getOfflineDb(userId).cache.get(
      'postharvest-parameters',
    );
    expect(saved?.value).toEqual(buildParameters());
  });

  it('asks for the chosen producer and keeps its copy apart', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(parametersHandler(buildParameters(), requests));

    const { result } = render(() => useParameters(userId, 'p2'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].get('producer')).toBe('p2');
    expect(
      await getOfflineDb(userId).cache.get(
        'postharvest-parameters:producer:p2',
      ),
    ).toBeDefined();
  });

  it('shows the saved copy, with its date, when the server does not answer', async () => {
    const userId = newUser();
    await getOfflineDb(userId).cache.put({
      key: 'postharvest-parameters',
      value: buildParameters({ version: 3, is_default: false }),
      fetchedAt: 1_700_000_000_000,
    });
    server.use(http.get(apiUrl(PATH), () => HttpResponse.error()));

    const { result } = render(() => useParameters(userId, null));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.version).toBe(3);
    expect(result.current.data?.savedAt).toBe(1_700_000_000_000);
  });

  it('does not use the copy for an error of the API', async () => {
    const userId = newUser();
    await getOfflineDb(userId).cache.put({
      key: 'postharvest-parameters',
      value: buildParameters(),
      fetchedAt: 1_700_000_000_000,
    });
    server.use(
      http.get(apiUrl(PATH), () => apiError(403, 'permission_denied')),
    );

    const { result } = render(() => useParameters(userId, null));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it('waits for the session, and for the producer when asked to', () => {
    const { result: noSession } = render(() => useParameters(undefined, null));
    const { result: disabled } = render(() =>
      useParameters(newUser(), null, { enabled: false }),
    );

    expect(noSession.current.fetchStatus).toBe('idle');
    expect(disabled.current.fetchStatus).toBe('idle');
  });
});

describe('useSaveParameters', () => {
  const values = toParameterValues(parametersFormOf(buildParameters().values));

  it('sends the 21 values with the version read, and refreshes the copy', async () => {
    const bodies: unknown[] = [];
    server.use(
      csrfHandler,
      http.put(apiUrl(PATH), async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(
          buildParameters({ is_default: false, version: 1 }),
        );
      }),
      parametersHandler(buildParameters({ is_default: false, version: 1 })),
    );

    const { result } = render(() => useSaveParameters(null));
    await act(() => result.current.mutateAsync({ expectedVersion: 0, values }));

    expect(bodies).toEqual([{ expected_version: 0, values }]);
  });

  it('sends the producer the technical account chose', async () => {
    const bodies: Record<string, unknown>[] = [];
    server.use(
      csrfHandler,
      http.put(apiUrl(PATH), async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(buildParameters());
      }),
      parametersHandler(buildParameters()),
    );

    const { result } = render(() => useSaveParameters('p2'));
    await act(() => result.current.mutateAsync({ expectedVersion: 2, values }));

    expect(bodies[0].producer).toBe('p2');
  });

  it('fails with the error of the API, keeping what it said', async () => {
    server.use(
      csrfHandler,
      http.put(apiUrl(PATH), () => apiError(409, 'stale_version')),
      parametersHandler(buildParameters()),
    );

    const { result } = render(() => useSaveParameters(null));

    await expect(
      act(() => result.current.mutateAsync({ expectedVersion: 0, values })),
    ).rejects.toMatchObject({ code: 'stale_version' });
  });
});

describe('useResetParameters', () => {
  it('asks for the baseline with the version read', async () => {
    const bodies: unknown[] = [];
    server.use(
      csrfHandler,
      http.post(apiUrl(`${PATH}/reset`), async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(buildParameters());
      }),
      parametersHandler(buildParameters()),
    );

    const { result } = render(() => useResetParameters(null));
    await act(() => result.current.mutateAsync(3));

    expect(bodies).toEqual([{ expected_version: 3 }]);
  });
});
