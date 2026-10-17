import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { apiUrl } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useEvidence } from './evidence-api';

const render = <T,>(hook: () => T) => {
  const client = createTestQueryClient();
  return renderHook(hook, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
};

const newUser = () => `evidence-api-${crypto.randomUUID()}`;

describe('useEvidence', () => {
  it('lists the photos of an activity', async () => {
    server.use(
      http.get(apiUrl('/api/agricultural-activities/a1/evidence'), () =>
        HttpResponse.json({
          results: [
            {
              id: 'e1',
              file_name: 'mazorca.jpg',
              content_type: 'image/jpeg',
              size: 300_000,
              uploaded_by: { id: 'u1', full_name: 'Carlos Rincón' },
              uploaded_at: '2026-10-19T16:00:00Z',
              captured_at: '2026-10-19T15:20:00Z',
            },
          ],
        }),
      ),
    );

    const { result } = render(() => useEvidence(newUser(), 'a1'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.map(({ id }) => id)).toEqual(['e1']);
  });
});
