import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { buildAgriculturalActivity } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { usePlotHistory } from './history-api';

const render = <T,>(hook: () => T) => {
  const client = createTestQueryClient();
  return renderHook(hook, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
};

const newUser = () => `history-${crypto.randomUUID()}`;
const HISTORY = apiUrl('/api/plots/pl1/phytosanitary-history');

const history = {
  results: [buildAgriculturalActivity({ id: 'm1' })],
  summary: [],
};

describe('usePlotHistory', () => {
  it('asks for the history of the plot with its filters', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      http.get(HISTORY, ({ request }) => {
        requests.push(new URL(request.url).searchParams);
        return HttpResponse.json(history);
      }),
    );

    const { result } = render(() =>
      usePlotHistory(newUser(), 'pl1', {
        from: '2026-01-01',
        to: '2026-10-31',
        other: true,
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].toString()).toBe(
      'from=2026-01-01&to=2026-10-31&other=true',
    );
    expect(result.current.data?.data.results.map(({ id }) => id)).toEqual([
      'm1',
    ]);
  });

  it('shows the last copy of the same filters without a network', async () => {
    const userId = newUser();
    server.use(http.get(HISTORY, () => HttpResponse.json(history)));
    const first = render(() =>
      usePlotHistory(userId, 'pl1', { pest_disease: 'monilia' }),
    );
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));

    server.use(http.get(HISTORY, () => HttpResponse.error()));
    const offline = render(() =>
      usePlotHistory(userId, 'pl1', { pest_disease: 'monilia' }),
    );

    await waitFor(() => expect(offline.result.current.isSuccess).toBe(true));
    expect(offline.result.current.data?.savedAt).toBeDefined();
  });

  it('asks for nothing without a query to send', () => {
    let asked = false;
    server.use(
      http.get(HISTORY, () => {
        asked = true;
        return HttpResponse.json(history);
      }),
    );

    render(() => usePlotHistory(newUser(), 'pl1', null));

    expect(asked).toBe(false);
  });
});
