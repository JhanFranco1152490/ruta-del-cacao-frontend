import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import type { SaleFilters } from '@/lib/api/query-keys';
import {
  buildBuyerOption,
  buildPage,
  buildSale,
  buildSaleListItem,
  buildStockRow,
} from '@/test/factories';
import {
  apiUrl,
  buyerOptionsHandler,
  saleHandler,
  salesHandler,
  saleSummaryHandler,
} from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import {
  type SaleSummaryFilters,
  useBuyerOptions,
  useFarmStock,
  useSale,
  useSales,
  useSalesSummary,
} from './queries';

const render = <T,>(hook: () => T) => {
  const client = createTestQueryClient();
  return renderHook(hook, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
};

const newUser = () => `sales-${crypto.randomUUID()}`;

const NOVEMBER: SaleSummaryFilters = {
  producer: null,
  from: '2026-11-01',
  to: '2026-11-30',
  farm: null,
  buyer: null,
  search: '',
};
const FILTERS: SaleFilters = { ...NOVEMBER, status: 'registered', page: 1 };

describe('useSales', () => {
  it('asks for the period with its filters, leaving out what is empty', async () => {
    const requests: URLSearchParams[] = [];
    server.use(salesHandler([buildSaleListItem()], requests));

    const { result } = render(() =>
      useSales(newUser(), { ...FILTERS, buyer: 'b1', search: ' 12 ', page: 2 }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].toString()).toBe(
      'from=2026-11-01&to=2026-11-30&buyer=b1&search=12&status=registered&page=2',
    );
    expect(result.current.data?.data.results).toHaveLength(1);
  });

  it('asks for every status when none is chosen', async () => {
    const requests: URLSearchParams[] = [];
    server.use(salesHandler([], requests));

    const { result } = render(() =>
      useSales(newUser(), { ...FILTERS, status: null }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].has('status')).toBe(false);
  });

  it('shows the copy of the first page without a network', async () => {
    const userId = newUser();
    server.use(salesHandler([buildSaleListItem()]));
    const first = render(() => useSales(userId, FILTERS));
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));

    server.use(http.get(apiUrl('/api/sales'), () => HttpResponse.error()));
    const offline = render(() => useSales(userId, FILTERS));

    await waitFor(() => expect(offline.result.current.isSuccess).toBe(true));
    expect(offline.result.current.data?.savedAt).toBeDefined();
    expect(offline.result.current.data?.data.results).toHaveLength(1);
  });

  it('keeps no copy of the next pages', async () => {
    const userId = newUser();
    server.use(salesHandler([buildSaleListItem()]));
    const first = render(() => useSales(userId, { ...FILTERS, page: 2 }));
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));

    server.use(http.get(apiUrl('/api/sales'), () => HttpResponse.error()));
    const offline = render(() => useSales(userId, { ...FILTERS, page: 2 }));

    await waitFor(() => expect(offline.result.current.isError).toBe(true));
  });
});

describe('useSalesSummary', () => {
  it('asks for the figures of the period, without status or page', async () => {
    const requests: URLSearchParams[] = [];
    server.use(saleSummaryHandler(undefined, requests));

    const { result } = render(() =>
      useSalesSummary(newUser(), { ...NOVEMBER, farm: 'f1' }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].toString()).toBe(
      'from=2026-11-01&to=2026-11-30&farm=f1',
    );
    expect(result.current.data?.data.total).toBe(3375000);
  });
});

describe('useSale', () => {
  it('reads a sale with its lines, and its copy without a network', async () => {
    const userId = newUser();
    server.use(saleHandler(buildSale()));
    const first = render(() => useSale(userId, 's1'));
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    expect(first.result.current.data?.data.lines).toHaveLength(2);

    server.use(http.get(apiUrl('/api/sales/:id'), () => HttpResponse.error()));
    const offline = render(() => useSale(userId, 's1'));

    await waitFor(() => expect(offline.result.current.isSuccess).toBe(true));
    expect(offline.result.current.data?.savedAt).toBeDefined();
  });
});

describe('useBuyerOptions', () => {
  it('asks for the active buyers of the chosen producer', async () => {
    const requests: URLSearchParams[] = [];
    server.use(buyerOptionsHandler([buildBuyerOption()], requests));

    const { result } = render(() => useBuyerOptions('p1', true));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].toString()).toBe('producer=p1');
    expect(result.current.data).toEqual([buildBuyerOption()]);
  });
});

describe('useFarmStock', () => {
  it('reads every page of the stock of the farm', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      http.get(apiUrl('/api/stock'), ({ request }) => {
        const params = new URL(request.url).searchParams;
        requests.push(params);
        const page = Number(params.get('page') ?? 1);
        const row = buildStockRow({
          lot: { id: `l${page}`, code: `L${page}` },
        });
        return HttpResponse.json({
          ...buildPage([row], 2),
          next: page === 1 ? apiUrl('/api/stock?page=2') : null,
        });
      }),
    );

    const { result } = render(() => useFarmStock('f1'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests.map(String)).toEqual([
      'farm=f1&page_size=100',
      'farm=f1&page_size=100&page=2',
    ]);
    expect(result.current.data?.map(({ lot }) => lot.id)).toEqual(['l1', 'l2']);
  });

  it('waits for a farm', () => {
    const { result } = render(() => useFarmStock(''));
    expect(result.current.fetchStatus).toBe('idle');
  });
});
