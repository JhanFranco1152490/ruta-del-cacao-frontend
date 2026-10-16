import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { getOfflineDb } from '@/lib/offline/db';
import { apiError, buildAgriculturalActivity } from '@/test/factories';
import {
  agriculturalActivitiesHandler,
  apiUrl,
  pendingActivitiesHandler,
} from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useActivitiesOfMonth, usePendingActivities } from './api';

function wrapperFor(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const render = <T,>(hook: () => T) =>
  renderHook(hook, { wrapper: wrapperFor(createTestQueryClient()) });

const newUser = () => `activities-${crypto.randomUUID()}`;

// Un fetch que no recibe respuesta, como sin red.
const offline = (path: string) =>
  http.get(apiUrl(path), () => HttpResponse.error());

const saveMonth = (
  userId: string,
  key: string,
  value: unknown[],
  fetchedAt = 1_700_000_000_000,
) => getOfflineDb(userId).cache.put({ key, value, fetchedAt });

describe('useActivitiesOfMonth', () => {
  it('asks for the whole month and keeps a copy of it', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(
      agriculturalActivitiesHandler([buildAgriculturalActivity()], requests),
    );

    const { result } = render(() =>
      useActivitiesOfMonth(userId, '2026-10', null),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].toString()).toBe('from=2026-10-01&to=2026-10-31');
    expect(result.current.data?.data.map(({ id }) => id)).toEqual(['a1']);
    const saved = await getOfflineDb(userId).cache.get(
      'agricultural-activities:2026-10',
    );
    expect(saved?.value).toEqual([buildAgriculturalActivity()]);
  });

  it('asks for the chosen producer and keeps its copy apart', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(agriculturalActivitiesHandler([], requests));

    const { result } = render(() =>
      useActivitiesOfMonth(userId, '2026-10', 'p2'),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].get('producer')).toBe('p2');
    expect(
      await getOfflineDb(userId).cache.get(
        'agricultural-activities:producer:p2:2026-10',
      ),
    ).toBeDefined();
  });

  describe('the window kept for working without a network', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-09T15:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const cached = (userId: string) =>
      getOfflineDb(userId)
        .cache.toArray()
        .then((rows) => rows.map(({ key }) => key).sort());

    it('also keeps the month before and the two after the current one', async () => {
      const userId = newUser();
      const requests: URLSearchParams[] = [];
      server.use(agriculturalActivitiesHandler([], requests));

      const { result } = render(() =>
        useActivitiesOfMonth(userId, '2026-10', null),
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      await waitFor(async () =>
        expect(await cached(userId)).toEqual([
          'agricultural-activities:2026-09',
          'agricultural-activities:2026-10',
          'agricultural-activities:2026-11',
          'agricultural-activities:2026-12',
          'agricultural-activities:pending',
        ]),
      );
      expect(requests.map((request) => request.get('from')).sort()).toEqual([
        '2026-09-01',
        '2026-10-01',
        '2026-11-01',
        '2026-12-01',
      ]);
    });

    it('also keeps what is pending until 90 days from today, for the producer asked', async () => {
      const userId = newUser();
      const requests: URLSearchParams[] = [];
      server.use(
        agriculturalActivitiesHandler([]),
        pendingActivitiesHandler([buildAgriculturalActivity()], requests),
      );

      const { result } = render(() =>
        useActivitiesOfMonth(userId, '2026-10', 'p2'),
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      await waitFor(async () =>
        expect(
          (await cached(userId)).includes(
            'agricultural-activities:producer:p2:pending',
          ),
        ).toBe(true),
      );
      expect(requests[0].get('through')).toBe('2027-01-07');
      expect(requests[0].get('producer')).toBe('p2');
    });

    it('keeps the month being viewed even when it is outside the window', async () => {
      const userId = newUser();
      server.use(agriculturalActivitiesHandler([]));

      const { result } = render(() =>
        useActivitiesOfMonth(userId, '2027-03', null),
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      await waitFor(async () =>
        expect(await cached(userId)).toEqual([
          'agricultural-activities:2026-09',
          'agricultural-activities:2026-10',
          'agricultural-activities:2026-11',
          'agricultural-activities:2026-12',
          'agricultural-activities:2027-03',
          'agricultural-activities:pending',
        ]),
      );
    });

    it('does not touch the saved months when there is no network', async () => {
      const userId = newUser();
      await saveMonth(userId, 'agricultural-activities:2026-10', [
        buildAgriculturalActivity(),
      ]);
      server.use(offline('/api/agricultural-activities'));

      const { result } = render(() =>
        useActivitiesOfMonth(userId, '2026-10', null),
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(await cached(userId)).toEqual(['agricultural-activities:2026-10']);
    });

    it('keeps the other months when one of them fails', async () => {
      const userId = newUser();
      server.use(
        http.get(apiUrl('/api/agricultural-activities'), ({ request }) =>
          new URL(request.url).searchParams.get('from') === '2026-11-01'
            ? apiError(500, 'server_error', 'Error del servidor.')
            : HttpResponse.json({ results: [] }),
        ),
      );

      const { result } = render(() =>
        useActivitiesOfMonth(userId, '2026-10', null),
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      await waitFor(async () =>
        expect(await cached(userId)).toEqual([
          'agricultural-activities:2026-09',
          'agricultural-activities:2026-10',
          'agricultural-activities:2026-12',
          'agricultural-activities:pending',
        ]),
      );
    });
  });

  it('falls back to the saved month, with its date, without a network', async () => {
    const userId = newUser();
    await saveMonth(userId, 'agricultural-activities:2026-10', [
      buildAgriculturalActivity(),
    ]);
    server.use(offline('/api/agricultural-activities'));

    const { result } = render(() =>
      useActivitiesOfMonth(userId, '2026-10', null),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.savedAt).toBe(1_700_000_000_000);
    expect(result.current.data?.data).toHaveLength(1);
  });

  it('fails without a network for a month that was never loaded', async () => {
    const userId = newUser();
    await saveMonth(userId, 'agricultural-activities:2026-10', [
      buildAgriculturalActivity(),
    ]);
    server.use(offline('/api/agricultural-activities'));

    const { result } = render(() =>
      useActivitiesOfMonth(userId, '2027-03', null),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).not.toBeInstanceOf(ApiError);
  });

  it('shows an error of the api instead of the saved copy', async () => {
    const userId = newUser();
    await saveMonth(userId, 'agricultural-activities:2026-10', [
      buildAgriculturalActivity(),
    ]);
    server.use(
      http.get(apiUrl('/api/agricultural-activities'), () =>
        apiError(403, 'permission_denied', 'No tienes permiso.'),
      ),
    );

    const { result } = render(() =>
      useActivitiesOfMonth(userId, '2026-10', null),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});

describe('usePendingActivities', () => {
  it('asks for what is open until 90 days from today and keeps a copy', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(
      pendingActivitiesHandler([buildAgriculturalActivity()], requests),
    );

    const { result } = render(() =>
      usePendingActivities(userId, '2026-10-13', null),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].toString()).toBe('through=2027-01-11');
    expect(result.current.data?.data.map(({ id }) => id)).toEqual(['a1']);
    const saved = await getOfflineDb(userId).cache.get(
      'agricultural-activities:pending',
    );
    expect(saved?.value).toEqual([buildAgriculturalActivity()]);
  });

  it('crosses the end of the month and of the year when counting the 90 days', async () => {
    const requests: URLSearchParams[] = [];
    server.use(pendingActivitiesHandler([], requests));

    const { result } = render(() =>
      usePendingActivities(newUser(), '2026-12-25', null),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].get('through')).toBe('2027-03-25');
  });

  it('asks for the chosen producer and keeps its copy apart', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(pendingActivitiesHandler([], requests));

    const { result } = render(() =>
      usePendingActivities(userId, '2026-10-13', 'p2'),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].get('producer')).toBe('p2');
    expect(
      await getOfflineDb(userId).cache.get(
        'agricultural-activities:producer:p2:pending',
      ),
    ).toBeDefined();
  });

  it('falls back to the saved copy, with its date, without a network', async () => {
    const userId = newUser();
    await saveMonth(userId, 'agricultural-activities:pending', [
      buildAgriculturalActivity(),
    ]);
    server.use(offline('/api/agricultural-activities/pending'));

    const { result } = render(() =>
      usePendingActivities(userId, '2026-10-13', null),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.savedAt).toBe(1_700_000_000_000);
    expect(result.current.data?.data).toHaveLength(1);
  });

  it('does not ask while it is not wanted', async () => {
    const requests: URLSearchParams[] = [];
    server.use(pendingActivitiesHandler([], requests));

    const { result } = render(() =>
      usePendingActivities(newUser(), '2026-10-13', null, { enabled: false }),
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.fetchStatus).toBe('idle');
    expect(requests).toEqual([]);
  });

  it('does not use the copy for an error from the API', async () => {
    const userId = newUser();
    await saveMonth(userId, 'agricultural-activities:pending', [
      buildAgriculturalActivity(),
    ]);
    server.use(
      http.get(apiUrl('/api/agricultural-activities/pending'), () =>
        apiError(403, 'permission_denied', 'Sin permiso.'),
      ),
    );

    const { result } = render(() =>
      usePendingActivities(userId, '2026-10-13', null),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});
