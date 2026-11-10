import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { buildSale } from '@/test/factories';
import { apiUrl, csrfHandler, saleWriteHandler } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import type { SaleCreateRequest } from './api';
import { useRegisterSale, useRemoveInvoice, useVoidSale } from './mutations';

// Los envíos con archivo se prueban en `mutations-files.test.ts`, en el entorno `node`: el
// `FormData` de jsdom no llega al `fetch` de las pruebas. Aquí, lo que vuelve a leer cada escritura.

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

const REQUEST: SaleCreateRequest = {
  farm_id: 'f1',
  buyer_id: 'b1',
  sale_date: '2026-11-20',
  notes: '',
  lines: [
    { lot_id: 'l1', grade: 'g1', quantity_kg: '150.0', price_per_kg: 18500 },
  ],
};

const expectSalesWarehouseAndLotsRead = (
  invalidate: ReturnType<typeof render>['invalidate'],
) => {
  expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.sales.all() });
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: queryKeys.warehouse.all(),
  });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.lots.all() });
};

describe('useRegisterSale', () => {
  it('registers the sale and reads Ventas, Bodega and Lotes again', async () => {
    const bodies: unknown[] = [];
    server.use(csrfHandler, saleWriteHandler('create', buildSale(), bodies));
    const { result, invalidate } = render(() => useRegisterSale());

    const outcome = await act(() =>
      result.current.mutateAsync({ request: REQUEST, invoice: null }),
    );

    expect(bodies).toEqual([REQUEST]);
    expect(outcome).toEqual({ sale: buildSale(), invoiceError: null });
    expectSalesWarehouseAndLotsRead(invalidate);
  });

  it('reads the stock again when the server refuses the sale', async () => {
    server.use(
      csrfHandler,
      saleWriteHandler(
        'create',
        HttpResponse.json(
          {
            detail: 'La cantidad supera lo disponible (95,0 kg)',
            code: 'stock_insufficient',
            fields: {},
            line: 0,
            available_kg: '95.0',
          },
          { status: 400 },
        ),
      ),
    );
    const { result, invalidate } = render(() => useRegisterSale());

    act(() => result.current.mutate({ request: REQUEST, invoice: null }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.sales.all(),
    });
  });
});

describe('useVoidSale', () => {
  it('voids the sale with its version and reason', async () => {
    const bodies: unknown[] = [];
    server.use(
      csrfHandler,
      saleWriteHandler('void', buildSale({ status: 'voided' }), bodies),
    );
    const { result, invalidate } = render(() => useVoidSale('s1'));

    await act(() =>
      result.current.mutateAsync({
        expected_version: 1,
        reason: 'El comprador no recogió el cacao.',
      }),
    );

    expect(bodies).toEqual([
      { expected_version: 1, reason: 'El comprador no recogió el cacao.' },
    ]);
    expectSalesWarehouseAndLotsRead(invalidate);
  });
});

describe('useRemoveInvoice', () => {
  it('removes the invoice of the sale', async () => {
    let removed = false;
    server.use(
      csrfHandler,
      http.delete(apiUrl('/api/sales/:id/invoice'), ({ params }) => {
        removed = params.id === 's1';
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result, invalidate } = render(() => useRemoveInvoice('s1'));

    await act(() => result.current.mutateAsync(undefined));

    expect(removed).toBe(true);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.sales.all(),
    });
  });
});
