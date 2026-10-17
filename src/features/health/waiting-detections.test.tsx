import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import type { components } from '@/lib/api/schema';
import { getOfflineDb } from '@/lib/offline/db';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { enqueueControl } from './control-queue';
import {
  useWaitingDetections,
  waitingDetectionsCacheKey,
} from './waiting-detections';

type WaitingDetection = components['schemas']['WaitingDetection'];

const waiting = (
  overrides: Partial<WaitingDetection> = {},
): WaitingDetection => ({
  id: 'd1',
  pest_disease: {
    id: 'monilia',
    name: 'Monilia',
    kind: 'disease',
    is_active: true,
  },
  other_description: null,
  affected_units: 12,
  incidence: '24.00',
  sampling_unit: 'trees',
  monitoring: { id: 'm1', done_date: '2026-10-19' },
  plot: { id: 'pl1', code: 'P-03', farm: { id: 'f1', name: 'La Esperanza' } },
  control_requested_by: { id: 'u2', full_name: 'Luis Mora' },
  control_requested_at: '2026-10-19T15:20:00Z',
  ...overrides,
});

const handler = (
  results: WaitingDetection[],
  requests: URLSearchParams[] = [],
) =>
  http.get(
    apiUrl('/api/phytosanitary-detections/without-control'),
    ({ request }) => {
      requests.push(new URL(request.url).searchParams);
      return HttpResponse.json({ results });
    },
  );

const render = <T,>(hook: () => T) => {
  const client = createTestQueryClient();
  return renderHook(hook, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
};

const newUser = () => `waiting-${crypto.randomUUID()}`;

describe('useWaitingDetections', () => {
  it('reads the detections that wait for a control and keeps a copy', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(handler([waiting()], requests));

    const { result } = render(() => useWaitingDetections(userId, null));

    await waitFor(() => expect(result.current.detections).toHaveLength(1));
    expect(requests[0].toString()).toBe('');
    expect(
      await getOfflineDb(userId).cache.get(waitingDetectionsCacheKey(null)),
    ).toBeDefined();
  });

  it('asks for the producer that the technical account chose', async () => {
    const requests: URLSearchParams[] = [];
    server.use(handler([], requests));

    const { result } = render(() => useWaitingDetections(newUser(), 'p2'));

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(requests[0].get('producer')).toBe('p2');
  });

  it('leaves out a detection whose control waits in the device', async () => {
    const userId = newUser();
    server.use(handler([waiting(), waiting({ id: 'd2' })]));
    await enqueueControl(userId, 'd1', {
      request: {
        id: 'c1',
        mode: 'scheduled',
        scheduled_date: '2026-10-25',
        assignee_id: 'u1',
      },
      label: 'Monilia · P-03',
    });

    const { result } = render(() => useWaitingDetections(userId, null));

    await waitFor(() =>
      expect(result.current.detections.map(({ id }) => id)).toEqual(['d2']),
    );
  });

  it('asks for nothing while it is turned off', () => {
    const requests: URLSearchParams[] = [];
    server.use(handler([], requests));

    render(() => useWaitingDetections(newUser(), null, { enabled: false }));

    expect(requests).toHaveLength(0);
  });
});
