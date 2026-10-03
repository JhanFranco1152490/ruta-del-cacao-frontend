import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { apiError, buildPlot } from '@/test/factories';
import { apiUrl, plotsHandler } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useFarmPlots } from './api';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

const someone = () => `plots-${crypto.randomUUID()}`;

describe('farm plots', () => {
  it('asks only for the plots of the farm', async () => {
    const requests: URLSearchParams[] = [];
    server.use(plotsHandler([buildPlot()], requests));

    const { result } = renderHook(() => useFarmPlots(someone(), 'f1'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(requests[0].get('farm')).toBe('f1');
    expect(result.current.data?.data.plots).toHaveLength(1);
    expect(result.current.data?.data.hasMore).toBe(false);
  });

  it('says when the farm has more plots than one page', async () => {
    server.use(
      http.get(apiUrl('/api/plots'), () =>
        HttpResponse.json({
          count: 101,
          next: 'http://x/api/plots?page=2',
          previous: null,
          results: [buildPlot()],
        }),
      ),
    );

    const { result } = renderHook(() => useFarmPlots(someone(), 'f1'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.data.hasMore).toBe(true);
  });

  it('shows the saved copy with its date when the server is unreachable', async () => {
    const userId = someone();
    server.use(plotsHandler([buildPlot({ code: 'P-guardada' })]));
    const first = renderHook(() => useFarmPlots(userId, 'f1'), { wrapper });
    await waitFor(() => expect(first.result.current.data).toBeDefined());

    server.use(http.get(apiUrl('/api/plots'), () => HttpResponse.error()));
    const second = renderHook(() => useFarmPlots(userId, 'f1'), { wrapper });

    await waitFor(() => expect(second.result.current.data).toBeDefined());
    expect(second.result.current.data?.data.plots[0].code).toBe('P-guardada');
    expect(second.result.current.data?.savedAt).toEqual(expect.any(Number));
  });

  it('does not hide a permission error behind the saved copy', async () => {
    const userId = someone();
    server.use(plotsHandler([buildPlot()]));
    const first = renderHook(() => useFarmPlots(userId, 'f1'), { wrapper });
    await waitFor(() => expect(first.result.current.data).toBeDefined());

    server.use(
      http.get(apiUrl('/api/plots'), () =>
        apiError(403, 'permission_denied', 'Sin permiso.'),
      ),
    );
    const second = renderHook(() => useFarmPlots(userId, 'f1'), { wrapper });

    await waitFor(() => expect(second.result.current.isError).toBe(true));
    expect(second.result.current.data).toBeUndefined();
  });
});
