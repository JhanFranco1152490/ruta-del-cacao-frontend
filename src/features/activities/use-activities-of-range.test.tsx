import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { getOfflineDb } from '@/lib/offline/db';
import { apiError, buildAgriculturalActivity } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useActivitiesOfRange } from './use-activities-of-range';

function wrapperFor(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const render = <T,>(hook: () => T) =>
  renderHook(hook, { wrapper: wrapperFor(createTestQueryClient()) });

const newUser = () => `range-${crypto.randomUUID()}`;

const septemberOne = buildAgriculturalActivity({
  id: 'sep',
  scheduled_date: '2026-09-30',
});
const octoberOne = buildAgriculturalActivity({
  id: 'oct',
  scheduled_date: '2026-10-01',
});

// Responde cada mes con lo suyo; `failing` lista los meses que no responden.
const byMonth = (months: Record<string, unknown[]>, failing: string[] = []) =>
  http.get(apiUrl('/api/agricultural-activities'), ({ request }) => {
    const month = new URL(request.url).searchParams.get('from')!.slice(0, 7);
    if (failing.includes(month)) return HttpResponse.error();
    return HttpResponse.json({ results: months[month] ?? [] });
  });

describe('useActivitiesOfRange', () => {
  it('joins the activities of every month the range touches', async () => {
    server.use(byMonth({ '2026-09': [septemberOne], '2026-10': [octoberOne] }));

    const { result } = render(() =>
      useActivitiesOfRange(newUser(), ['2026-09', '2026-10'], null),
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.activities.map(({ id }) => id)).toEqual([
      'sep',
      'oct',
    ]);
    expect(result.current.unavailable).toEqual([]);
    expect(result.current.savedAt).toBeUndefined();
  });

  it('is pending while a month has not answered', () => {
    server.use(byMonth({}));

    const { result } = render(() =>
      useActivitiesOfRange(newUser(), ['2026-09', '2026-10'], null),
    );

    expect(result.current.isPending).toBe(true);
    expect(result.current.activities).toEqual([]);
  });

  it('uses the saved copy of both months without a network, with the oldest date', async () => {
    const userId = newUser();
    const db = getOfflineDb(userId);
    await db.cache.put({
      key: 'agricultural-activities:2026-09',
      value: [septemberOne],
      fetchedAt: 1_700_000_000_000,
    });
    await db.cache.put({
      key: 'agricultural-activities:2026-10',
      value: [octoberOne],
      fetchedAt: 1_700_500_000_000,
    });
    server.use(byMonth({}, ['2026-09', '2026-10']));

    const { result } = render(() =>
      useActivitiesOfRange(userId, ['2026-09', '2026-10'], null),
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.activities.map(({ id }) => id)).toEqual([
      'sep',
      'oct',
    ]);
    expect(result.current.savedAt).toBe(1_700_000_000_000);
    expect(result.current.unavailable).toEqual([]);
  });

  it('keeps what loaded and names the month that has no copy and no network', async () => {
    server.use(byMonth({ '2026-09': [septemberOne] }, ['2026-10']));

    const { result } = render(() =>
      useActivitiesOfRange(newUser(), ['2026-09', '2026-10'], null),
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.activities.map(({ id }) => id)).toEqual(['sep']);
    expect(result.current.unavailable).toEqual(['2026-10']);
    expect(result.current.error).toBeNull();
  });

  it('reports an error from the API apart from missing connection', async () => {
    server.use(
      http.get(apiUrl('/api/agricultural-activities'), () =>
        apiError(500, 'internal_error', 'Error del servidor.'),
      ),
    );

    const { result } = render(() =>
      useActivitiesOfRange(newUser(), ['2026-10'], null),
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.error).not.toBeNull();
    expect(result.current.unavailable).toEqual([]);
  });

  it('keeps only the newest version of an activity found in two copies', async () => {
    // Reprogramada de octubre a noviembre: la copia vieja de octubre aún la trae.
    const stale = buildAgriculturalActivity({
      id: 'moved',
      scheduled_date: '2026-10-30',
      version: 1,
    });
    const fresh = buildAgriculturalActivity({
      id: 'moved',
      scheduled_date: '2026-11-02',
      version: 2,
    });
    server.use(byMonth({ '2026-10': [stale], '2026-11': [fresh] }));

    const { result } = render(() =>
      useActivitiesOfRange(newUser(), ['2026-10', '2026-11'], null),
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.activities).toEqual([fresh]);
  });

  it('asks for the chosen producer', async () => {
    const seen: (string | null)[] = [];
    server.use(
      http.get(apiUrl('/api/agricultural-activities'), ({ request }) => {
        seen.push(new URL(request.url).searchParams.get('producer'));
        return HttpResponse.json({ results: [] });
      }),
    );

    const { result } = render(() =>
      useActivitiesOfRange(newUser(), ['2026-10'], 'p2'),
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(seen).toContain('p2');
  });
});
