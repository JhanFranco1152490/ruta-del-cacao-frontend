import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import type { StockFilters } from '@/lib/api/query-keys';
import {
  buildLotStock,
  buildPendingEntry,
  buildStockRow,
  buildWarehouse,
} from '@/test/factories';
import {
  apiUrl,
  lotStockHandler,
  pendingEntryHandler,
  stockListHandler,
  stockLocationsHandler,
  stockSummaryHandler,
  warehousesHandler,
} from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import {
  type StockSummaryFilters,
  useLotStock,
  usePendingEntry,
  useStock,
  useStockLocations,
  useStockSummary,
  useWarehouses,
} from './queries';

const render = <T,>(hook: () => T) => {
  const client = createTestQueryClient();
  return renderHook(hook, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
};

const newUser = () => `warehouse-${crypto.randomUUID()}`;

const NO_SUMMARY_FILTERS: StockSummaryFilters = {
  producer: null,
  farm: null,
  warehouse: null,
  grade: null,
  location: '',
  search: '',
};
const NO_FILTERS: StockFilters = {
  ...NO_SUMMARY_FILTERS,
  ordering: null,
  page: 1,
};

describe('useStock', () => {
  it('asks for the stock with its filters and order, leaving out what is empty', async () => {
    const requests: URLSearchParams[] = [];
    server.use(stockListHandler([buildStockRow()], requests));

    const { result } = render(() =>
      useStock(newUser(), {
        ...NO_FILTERS,
        warehouse: 'w1',
        grade: 'g2',
        location: ' Estante 3 ',
        ordering: '-quantity',
        page: 2,
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].toString()).toBe(
      'warehouse=w1&grade=g2&location=Estante+3&ordering=-quantity&page=2',
    );
    expect(result.current.data?.data.results).toHaveLength(1);
  });

  it('shows the copy of the first page without a network', async () => {
    const userId = newUser();
    server.use(stockListHandler([buildStockRow()]));
    const first = render(() => useStock(userId, NO_FILTERS));
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));

    server.use(http.get(apiUrl('/api/stock'), () => HttpResponse.error()));
    const offline = render(() => useStock(userId, NO_FILTERS));

    await waitFor(() => expect(offline.result.current.isSuccess).toBe(true));
    expect(offline.result.current.data?.savedAt).toBeDefined();
    expect(offline.result.current.data?.data.results).toHaveLength(1);
  });

  it('keeps no copy of the next pages', async () => {
    const userId = newUser();
    server.use(stockListHandler([buildStockRow()]));
    const first = render(() => useStock(userId, { ...NO_FILTERS, page: 2 }));
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));

    server.use(http.get(apiUrl('/api/stock'), () => HttpResponse.error()));
    const offline = render(() => useStock(userId, { ...NO_FILTERS, page: 2 }));

    await waitFor(() => expect(offline.result.current.isError).toBe(true));
  });
});

describe('useStockSummary', () => {
  it('asks for the totals with the same filters, without order or page', async () => {
    const requests: URLSearchParams[] = [];
    server.use(stockSummaryHandler(undefined, requests));

    const { result } = render(() =>
      useStockSummary(newUser(), { ...NO_SUMMARY_FILTERS, farm: 'f1' }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].toString()).toBe('farm=f1');
    expect(result.current.data?.data.g1_kg).toBe('250.0');
  });
});

describe('usePendingEntry', () => {
  it('asks for the lots to store with the search', async () => {
    const requests: URLSearchParams[] = [];
    server.use(pendingEntryHandler([buildPendingEntry()], requests));

    const { result } = render(() =>
      usePendingEntry(
        newUser(),
        { producer: null, farm: null, search: 'F02', page: 1 },
        true,
      ),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].toString()).toBe('search=F02');
  });

  it('does not ask without the permission to store', async () => {
    const requests: URLSearchParams[] = [];
    server.use(pendingEntryHandler([], requests));

    const { result } = render(() =>
      usePendingEntry(
        newUser(),
        { producer: null, farm: null, search: '', page: 1 },
        false,
      ),
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(requests).toHaveLength(0);
  });
});

describe('useWarehouses', () => {
  it('asks for the active warehouses of a farm', async () => {
    const requests: URLSearchParams[] = [];
    server.use(warehousesHandler([buildWarehouse()], requests));

    const { result } = render(() =>
      useWarehouses(newUser(), {
        producer: null,
        farm: 'f1',
        active: true,
        page: 1,
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].toString()).toBe('farm=f1&active=true');
  });
});

describe('useStockLocations', () => {
  it('asks for the locations of the chosen warehouse only', async () => {
    const requests: URLSearchParams[] = [];
    server.use(stockLocationsHandler(['Estante 3', 'Zona A'], requests));

    const none = render(() => useStockLocations(null));
    expect(none.result.current.fetchStatus).toBe('idle');

    const { result } = render(() => useStockLocations('w1'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].toString()).toBe('warehouse=w1');
    expect(result.current.data).toEqual(['Estante 3', 'Zona A']);
  });
});

describe('useLotStock', () => {
  it('reads the stock of a lot only when allowed', async () => {
    server.use(lotStockHandler(buildLotStock()));

    const off = render(() => useLotStock('l1', false));
    expect(off.result.current.fetchStatus).toBe('idle');

    const { result } = render(() => useLotStock('l1', true));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.lot.status).toBe('classified');
  });
});
