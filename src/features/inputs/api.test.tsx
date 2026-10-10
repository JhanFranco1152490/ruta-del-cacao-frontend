import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import {
  apiError,
  buildAgriculturalInput,
  buildInputMovement,
  buildInputStock,
} from '@/test/factories';
import {
  agriculturalInputsHandler,
  apiUrl,
  inputMovementsHandler,
  inputStocksHandler,
} from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import {
  currentInputOf,
  duplicateInputOf,
  INPUT_ERROR,
  useAgriculturalInputs,
  useCreateAgriculturalInput,
  useCreateInputMovement,
  useDeleteAgriculturalInput,
  useInputMovements,
  useInputStocks,
  useUpdateAgriculturalInput,
  type AgriculturalInputCreateRequest,
  type InputMovementCreateRequest,
} from './api';
import { buildMovementRequest } from './movement-schemas';
import type { InputFormValues } from './schemas';

function wrapperFor(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const newUser = () => `inputs-${crypto.randomUUID()}`;

// Un fetch que no recibe respuesta, como sin red.
const offline = (path: string) =>
  http.get(apiUrl(path), () => HttpResponse.error());

describe('the form values match the api', () => {
  it('sends the input form as the create body', () => {
    expectTypeOf<InputFormValues>().toExtend<AgriculturalInputCreateRequest>();
  });

  it('sends the movement form as the movement body', () => {
    expectTypeOf<
      ReturnType<typeof buildMovementRequest>
    >().toExtend<InputMovementCreateRequest>();
  });
});

describe('useAgriculturalInputs', () => {
  it('reads the own catalog without a producer and keeps a copy', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(agriculturalInputsHandler([buildAgriculturalInput()], requests));

    const { result } = renderHook(() => useAgriculturalInputs(userId, null), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.map((input) => input.name)).toEqual([
      'Urea 46 %',
    ]);
    expect(requests[0].toString()).toBe('');
    const saved = await getOfflineDb(userId).cache.get('agricultural-inputs');
    expect(saved?.value).toEqual([buildAgriculturalInput()]);
  });

  it('asks for the chosen producer and keeps its copy apart', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(agriculturalInputsHandler([], requests));

    const { result } = renderHook(() => useAgriculturalInputs(userId, 'p2'), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].get('producer')).toBe('p2');
    expect(
      await getOfflineDb(userId).cache.get('agricultural-inputs:producer:p2'),
    ).toBeDefined();
  });

  it('falls back to the saved copy, with its date, without a network', async () => {
    const userId = newUser();
    await getOfflineDb(userId).cache.put({
      key: 'agricultural-inputs',
      value: [buildAgriculturalInput()],
      fetchedAt: 1_700_000_000_000,
    });
    server.use(offline('/api/agricultural-inputs'));

    const { result } = renderHook(() => useAgriculturalInputs(userId, null), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.savedAt).toBe(1_700_000_000_000);
    expect(result.current.data?.data).toHaveLength(1);
  });
});

describe('useInputStocks', () => {
  it('reads the stocks of the farm and keeps a copy per farm', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(inputStocksHandler([buildInputStock()], requests));

    const { result } = renderHook(() => useInputStocks(userId, 'f1'), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].get('farm')).toBe('f1');
    expect(result.current.data?.data[0].quantity).toBe('100.000');
    expect(
      await getOfflineDb(userId).cache.get('input-stocks:farm:f1'),
    ).toBeDefined();
  });

  it('asks for nothing until a farm is chosen', () => {
    const requests: URLSearchParams[] = [];
    server.use(inputStocksHandler([], requests));

    const { result } = renderHook(() => useInputStocks(newUser(), null), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(requests).toHaveLength(0);
  });

  it('falls back to the copy of the farm without a network', async () => {
    const userId = newUser();
    await getOfflineDb(userId).cache.put({
      key: 'input-stocks:farm:f1',
      value: [buildInputStock({ quantity: '-20.000' })],
      fetchedAt: 1_700_000_000_000,
    });
    server.use(offline('/api/input-stocks'));

    const { result } = renderHook(() => useInputStocks(userId, 'f1'), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data[0].quantity).toBe('-20.000');
    expect(result.current.data?.savedAt).toBe(1_700_000_000_000);
  });
});

describe('useInputMovements', () => {
  it('pages the movements of the input in the farm', async () => {
    const movements = Array.from({ length: 25 }, (_, index) =>
      buildInputMovement({ id: `mv${index}` }),
    );
    const requests: URLSearchParams[] = [];
    server.use(inputMovementsHandler(movements, requests));

    const { result } = renderHook(() => useInputMovements('in1', 'f1'), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].get('input')).toBe('in1');
    expect(requests[0].get('farm')).toBe('f1');
    expect(requests[0].get('page_size')).toBe('20');
    expect(result.current.hasNextPage).toBe(true);

    await act(() => result.current.fetchNextPage());

    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
    expect(requests[1].get('page')).toBe('2');
    expect(
      result.current.data?.pages.flatMap((page) => page.results),
    ).toHaveLength(25);
  });
});

describe('catalog writes', () => {
  const catalogKey = queryKeys.agriculturalInputs.list(null);

  it('creates an input and refreshes the catalog', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(catalogKey, { data: [] });
    let body: unknown;
    server.use(
      http.post(apiUrl('/api/agricultural-inputs'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(buildAgriculturalInput(), { status: 201 });
      }),
    );
    const { result } = renderHook(() => useCreateAgriculturalInput(), {
      wrapper: wrapperFor(queryClient),
    });

    await act(() =>
      result.current.mutateAsync({
        name: 'Urea 46 %',
        input_type: 'fertilizer',
        unit: 'kg',
        package_type: null,
        package_size: null,
      }),
    );

    expect(body).toEqual({
      name: 'Urea 46 %',
      input_type: 'fertilizer',
      unit: 'kg',
      package_type: null,
      package_size: null,
    });
    expect(queryClient.getQueryState(catalogKey)?.isInvalidated).toBe(true);
  });

  it('updates with the read version and refreshes the catalog even when it fails', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(catalogKey, { data: [] });
    let body: unknown;
    server.use(
      http.patch(
        apiUrl('/api/agricultural-inputs/in1'),
        async ({ request }) => {
          body = await request.json();
          return apiError(409, 'stale_version');
        },
      ),
    );
    const { result } = renderHook(() => useUpdateAgriculturalInput(), {
      wrapper: wrapperFor(queryClient),
    });

    await act(async () => {
      await result.current
        .mutateAsync({
          id: 'in1',
          body: { is_active: false, expected_version: 3 },
        })
        .catch(() => undefined);
    });

    expect(body).toEqual({ is_active: false, expected_version: 3 });
    expect(queryClient.getQueryState(catalogKey)?.isInvalidated).toBe(true);
  });

  it('deletes with the version in the url', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(catalogKey, { data: [] });
    const urls: URL[] = [];
    server.use(
      http.delete(apiUrl('/api/agricultural-inputs/in1'), ({ request }) => {
        urls.push(new URL(request.url));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result } = renderHook(() => useDeleteAgriculturalInput(), {
      wrapper: wrapperFor(queryClient),
    });

    await act(() =>
      result.current.mutateAsync({ id: 'in1', expectedVersion: 2 }),
    );

    expect(urls[0].searchParams.get('expected_version')).toBe('2');
    expect(queryClient.getQueryState(catalogKey)?.isInvalidated).toBe(true);
  });
});

describe('useCreateInputMovement', () => {
  it('refreshes the stocks of the farm, its movements and the catalog', async () => {
    const queryClient = createTestQueryClient();
    const stocks = queryKeys.inputStocks.byFarm('f1');
    const otherFarm = queryKeys.inputStocks.byFarm('f2');
    const movements = queryKeys.inputMovements.list('in1', 'f1');
    const catalog = queryKeys.agriculturalInputs.list(null);
    for (const key of [stocks, otherFarm, movements, catalog]) {
      queryClient.setQueryData(key, { data: [] });
    }
    let body: unknown;
    server.use(
      http.post(apiUrl('/api/input-movements'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          { movement: buildInputMovement(), stock: buildInputStock() },
          { status: 201 },
        );
      }),
    );
    const { result } = renderHook(() => useCreateInputMovement(), {
      wrapper: wrapperFor(queryClient),
    });
    const request = buildMovementRequest(
      { id: 'mv-new', inputId: 'in1', farmId: 'f1' },
      'entry',
      { occurred_on: '2026-10-07', quantity: '100', note: '' },
    );

    await act(() => result.current.mutateAsync(request));

    expect(body).toEqual(request);
    expect(queryClient.getQueryState(stocks)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(movements)?.isInvalidated).toBe(true);
    // El primer movimiento cambia `has_records`: el insumo ya no se puede eliminar.
    expect(queryClient.getQueryState(catalog)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(otherFarm)?.isInvalidated).toBe(false);
  });
});

describe('error details', () => {
  const existing = {
    id: 'in9',
    name: 'Urea 46 %',
    input_type: 'fertilizer' as const,
    is_active: false,
  };

  it('reads the existing input of a duplicate', () => {
    const error = new ApiError(409, {
      detail: 'Ya existe.',
      code: INPUT_ERROR.duplicate,
      fields: {},
      existing,
    });

    expect(duplicateInputOf(error)).toEqual(existing);
    expect(currentInputOf(error)).toBeNull();
  });

  it('reads the current input of a stale version', () => {
    const current = buildAgriculturalInput({ version: 4 });
    const error = new ApiError(409, {
      detail: 'Cambió.',
      code: INPUT_ERROR.staleVersion,
      fields: {},
      current,
    });

    expect(currentInputOf(error)).toEqual(current);
    expect(duplicateInputOf(error)).toBeNull();
  });

  it('ignores errors that are not from the api', () => {
    expect(duplicateInputOf(new TypeError('offline'))).toBeNull();
    expect(currentInputOf(undefined)).toBeNull();
  });
});
