import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useNoControlNeeded } from './use-control-actions';

describe('useNoControlNeeded', () => {
  it('refreshes the activities, what health shows and the notifications', async () => {
    const sent: string[] = [];
    server.use(
      http.post(
        apiUrl('/api/phytosanitary-detections/:id/no-control-needed'),
        ({ params }) => {
          sent.push(String(params.id));
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );
    const queryClient = createTestQueryClient();
    const keys = [
      queryKeys.agriculturalActivities.all(),
      queryKeys.health.all(),
      queryKeys.notifications.all(),
    ];
    for (const key of keys) queryClient.setQueryData(key, {});
    const { result } = renderHook(() => useNoControlNeeded(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    await act(() => result.current.mutateAsync('d1'));

    expect(sent).toEqual(['d1']);
    for (const key of keys) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    }
  });
});
