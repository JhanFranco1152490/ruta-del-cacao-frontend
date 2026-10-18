import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { buildAgriculturalActivity } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { usePendingMonitorings } from './pending-monitorings';

const render = <T,>(hook: () => T) => {
  const client = createTestQueryClient();
  return renderHook(hook, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
};

const newUser = () => `pending-${crypto.randomUUID()}`;
const PENDING = apiUrl('/api/agricultural-activities/pending');
const monitoring = buildAgriculturalActivity({
  id: 'm1',
  activity_type: 'phytosanitary_monitoring',
});

describe('usePendingMonitorings', () => {
  it('asks only for the monitorings up to today', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      http.get(PENDING, ({ request }) => {
        requests.push(new URL(request.url).searchParams);
        return HttpResponse.json({ results: [monitoring] });
      }),
    );

    const { result } = render(() =>
      usePendingMonitorings(newUser(), '2026-10-22', null),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].get('through')).toBe('2026-10-22');
    expect(requests[0].get('activity_type')).toBe('phytosanitary_monitoring');
    expect(requests[0].has('producer')).toBe(false);
    expect(result.current.data?.data.map(({ id }) => id)).toEqual(['m1']);
  });

  it('narrows to a producer for the technical account', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      http.get(PENDING, ({ request }) => {
        requests.push(new URL(request.url).searchParams);
        return HttpResponse.json({ results: [] });
      }),
    );

    const { result } = render(() =>
      usePendingMonitorings(newUser(), '2026-10-22', 'pr1'),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].get('producer')).toBe('pr1');
  });

  it('shows the last copy without a network', async () => {
    const userId = newUser();
    server.use(
      http.get(PENDING, () => HttpResponse.json({ results: [monitoring] })),
    );
    const first = render(() =>
      usePendingMonitorings(userId, '2026-10-22', null),
    );
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));

    server.use(http.get(PENDING, () => HttpResponse.error()));
    const offline = render(() =>
      usePendingMonitorings(userId, '2026-10-22', null),
    );

    await waitFor(() => expect(offline.result.current.isSuccess).toBe(true));
    expect(offline.result.current.data?.savedAt).toBeDefined();
  });

  it('asks for nothing when it is disabled', () => {
    let asked = false;
    server.use(
      http.get(PENDING, () => {
        asked = true;
        return HttpResponse.json({ results: [] });
      }),
    );

    render(() =>
      usePendingMonitorings(newUser(), '2026-10-22', null, { enabled: false }),
    );

    expect(asked).toBe(false);
  });
});
