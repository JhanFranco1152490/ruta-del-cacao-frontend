import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { buildFarm } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useChangeFarmStatus } from './api';

describe('useChangeFarmStatus', () => {
  it('refreshes every read of the farm, not only the list', async () => {
    const queryClient = createTestQueryClient();
    const detailView = queryKeys.farms.detailView('f1');
    const mapCounts = queryKeys.farms.mapCounts({});
    queryClient.setQueryData(detailView, { data: buildFarm() });
    queryClient.setQueryData(mapCounts, []);
    server.use(
      http.patch(apiUrl('/api/farms/f1'), () =>
        HttpResponse.json(buildFarm({ is_active: false, version: 3 })),
      ),
    );
    const { result } = renderHook(() => useChangeFarmStatus(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    await act(() =>
      result.current.mutateAsync({
        id: 'f1',
        isActive: false,
        expectedVersion: 2,
      }),
    );

    await waitFor(() => {
      expect(queryClient.getQueryState(detailView)?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(mapCounts)?.isInvalidated).toBe(true);
    });
  });
});
