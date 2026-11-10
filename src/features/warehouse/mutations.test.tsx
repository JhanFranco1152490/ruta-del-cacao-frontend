import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import {
  buildLotStock,
  buildStockEntry,
  buildWarehouse,
} from '@/test/factories';
import {
  apiUrl,
  stockWriteHandler,
  warehouseWriteHandler,
} from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import {
  useCorrectEntry,
  useCreateWarehouse,
  useDeleteWarehouse,
  useRegisterEntry,
  useRegisterExit,
  useUpdateWarehouse,
  useVoidExit,
} from './mutations';

const render = <T,>(hook: () => T) => {
  const client = createTestQueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const rendered = renderHook(hook, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  return { ...rendered, invalidate };
};

const IN_WAREHOUSE = buildLotStock({
  lot: {
    id: 'l1',
    code: '000123-F02-P05-261014-1',
    status: 'in_warehouse',
    version: 11,
  },
  entry: buildStockEntry(),
  balances: [{ grade: 'g1', quantity_kg: '250.0' }],
});

describe('lot stock writes', () => {
  it('stores the lot and reads Bodega and Lotes again', async () => {
    const bodies: unknown[] = [];
    server.use(stockWriteHandler('entry', IN_WAREHOUSE, bodies));
    const { result, invalidate } = render(() => useRegisterEntry('l1'));

    const body = {
      expected_lot_version: 10,
      entry_date: '2026-10-30',
      warehouse_id: 'w1',
      location: 'Estante 3',
    };
    await act(() => result.current.mutateAsync(body));

    expect(bodies).toEqual([body]);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.warehouse.all(),
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.lots.all() });
  });

  it('corrects the entry with PATCH', async () => {
    const bodies: unknown[] = [];
    server.use(stockWriteHandler('entry-correction', IN_WAREHOUSE, bodies));
    const { result } = render(() => useCorrectEntry('l1'));

    await act(() =>
      result.current.mutateAsync({
        expected_version: 1,
        location: 'Estante 5',
      }),
    );

    expect(bodies).toEqual([{ expected_version: 1, location: 'Estante 5' }]);
  });

  it('registers an exit', async () => {
    const bodies: unknown[] = [];
    server.use(stockWriteHandler('exit', IN_WAREHOUSE, bodies));
    const { result } = render(() => useRegisterExit('l1'));

    const body = {
      grade: 'g1' as const,
      quantity_kg: '5.0',
      exit_date: '2026-10-31',
      reason: 'sample' as const,
      detail: '',
    };
    await act(() => result.current.mutateAsync(body));

    expect(bodies).toEqual([body]);
  });

  it('voids an exit, with the exit in the address and the reason in the body', async () => {
    const paths: string[] = [];
    const bodies: unknown[] = [];
    server.use(
      http.post(
        apiUrl('/api/stock/:id/exits/:exitId/void'),
        async ({ request }) => {
          paths.push(new URL(request.url).pathname);
          bodies.push(await request.json());
          return HttpResponse.json(IN_WAREHOUSE);
        },
      ),
    );
    const { result } = render(() => useVoidExit('l1'));

    await act(() =>
      result.current.mutateAsync({
        exitId: 'e1',
        reason: 'Error de digitación',
      }),
    );

    expect(paths).toEqual(['/api/stock/l1/exits/e1/void']);
    expect(bodies).toEqual([{ reason: 'Error de digitación' }]);
  });

  it('reads nothing again when the server rejects', async () => {
    server.use(
      stockWriteHandler(
        'exit',
        HttpResponse.json(
          {
            detail: 'Insuficiente.',
            code: 'stock_insufficient',
            fields: {},
            available_kg: '245.0',
          },
          { status: 400 },
        ),
      ),
    );
    const { result, invalidate } = render(() => useRegisterExit('l1'));

    await act(() =>
      result.current
        .mutateAsync({
          grade: 'g1',
          quantity_kg: '300.0',
          exit_date: '2026-10-31',
          reason: 'sample',
          detail: '',
        })
        .catch(() => undefined),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe('warehouse writes', () => {
  it('registers a warehouse', async () => {
    const bodies: unknown[] = [];
    server.use(warehouseWriteHandler('create', buildWarehouse(), bodies));
    const { result } = render(() => useCreateWarehouse());

    await act(() =>
      result.current.mutateAsync({ farm_id: 'f1', name: 'Bodega principal' }),
    );

    expect(bodies).toEqual([{ farm_id: 'f1', name: 'Bodega principal' }]);
  });

  it('deactivates a warehouse with its version', async () => {
    const bodies: unknown[] = [];
    server.use(
      warehouseWriteHandler(
        'update',
        buildWarehouse({ is_active: false, version: 2 }),
        bodies,
      ),
    );
    const { result } = render(() => useUpdateWarehouse('w1'));

    await act(() =>
      result.current.mutateAsync({ expected_version: 1, is_active: false }),
    );

    expect(bodies).toEqual([{ expected_version: 1, is_active: false }]);
  });

  it('deletes a warehouse with the version in the address', async () => {
    const queries: unknown[] = [];
    server.use(warehouseWriteHandler('delete', null, queries));
    const { result, invalidate } = render(() => useDeleteWarehouse('w1'));

    await act(() => result.current.mutateAsync(3));

    expect((queries[0] as URLSearchParams).get('expected_version')).toBe('3');
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.warehouse.all(),
    });
  });
});
