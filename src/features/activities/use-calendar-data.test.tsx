import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { getOfflineDb } from '@/lib/offline/db';
import { buildAgriculturalActivity } from '@/test/factories';
import {
  agriculturalActivitiesHandler,
  apiUrl,
  pendingActivitiesHandler,
} from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { type CalendarScope, useCalendarData } from './use-calendar-data';

function wrapperFor(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const TODAY = '2026-10-22';
const newUser = () => `calendar-${crypto.randomUUID()}`;

function render(scope: Partial<CalendarScope> = {}, userId = newUser()) {
  return renderHook(
    () =>
      useCalendarData({
        userId,
        view: 'lista',
        month: '2026-10',
        week: '2026-10-19',
        today: TODAY,
        producer: null,
        ...scope,
      }),
    { wrapper: wrapperFor(createTestQueryClient()) },
  );
}

const at = (id: string, scheduled_date: string) =>
  buildAgriculturalActivity({ id, scheduled_date });

describe('useCalendarData', () => {
  it.each(['mes', 'lista', 'parcela'] as const)(
    'reads the month in the %s view',
    async (view) => {
      const requests: URLSearchParams[] = [];
      server.use(
        agriculturalActivitiesHandler([at('a', '2026-10-05')], requests),
      );

      const { result } = render({ view });

      await waitFor(() => expect(result.current.isPending).toBe(false));
      expect(requests.map((request) => request.get('from'))).toContain(
        '2026-10-01',
      );
      expect(result.current.items.map(({ activity }) => activity.id)).toEqual([
        'a',
      ]);
    },
  );

  it('reads both months when the week crosses them and keeps only the days of the week', async () => {
    server.use(
      http.get(apiUrl('/api/agricultural-activities'), ({ request }) => {
        const month = new URL(request.url).searchParams
          .get('from')!
          .slice(0, 7);
        return HttpResponse.json({
          results:
            month === '2026-10'
              ? [at('before', '2026-10-20'), at('in-oct', '2026-10-27')]
              : [at('in-nov', '2026-11-01'), at('after', '2026-11-20')],
        });
      }),
    );

    const { result } = render({ view: 'semana', week: '2026-10-26' });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.items.map(({ activity }) => activity.id)).toEqual([
      'in-oct',
      'in-nov',
    ]);
  });

  it('reads what is pending, not a month, in the pending view', async () => {
    const monthRequests: URLSearchParams[] = [];
    const pendingRequests: URLSearchParams[] = [];
    server.use(
      agriculturalActivitiesHandler([], monthRequests),
      pendingActivitiesHandler([at('old', '2026-03-02')], pendingRequests),
    );

    const { result } = render({ view: 'pendientes' });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.items.map(({ activity }) => activity.id)).toEqual([
      'old',
    ]);
    expect(pendingRequests[0].get('through')).toBe('2027-01-20');
    expect(monthRequests).toEqual([]);
  });

  it('does not show what is pending in the other views', async () => {
    server.use(
      agriculturalActivitiesHandler([at('month', '2026-10-05')]),
      pendingActivitiesHandler([at('old', '2026-03-02')]),
    );

    const { result } = render({ view: 'lista' });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.items.map(({ activity }) => activity.id)).toEqual([
      'month',
    ]);
  });

  it('computes the state of each activity with the date of today', async () => {
    server.use(agriculturalActivitiesHandler([at('a', '2026-10-17')]));

    const { result } = render();

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.items[0]).toMatchObject({
      state: 'overdue',
      daysLate: 5,
    });
  });

  it('says the month was never loaded when there is no network and no copy', async () => {
    server.use(
      http.get(apiUrl('/api/agricultural-activities'), () =>
        HttpResponse.error(),
      ),
    );

    const { result } = render();

    await waitFor(() => expect(result.current.neverLoaded).toBe(true));
    expect(result.current.items).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('says the pending view was never loaded when there is no network and no copy', async () => {
    server.use(
      http.get(apiUrl('/api/agricultural-activities/pending'), () =>
        HttpResponse.error(),
      ),
    );

    const { result } = render({ view: 'pendientes' });

    await waitFor(() => expect(result.current.neverLoaded).toBe(true));
  });

  it('shows what there is and names the month that is missing', async () => {
    const userId = newUser();
    await getOfflineDb(userId).cache.put({
      key: 'agricultural-activities:2026-10',
      value: [at('in-oct', '2026-10-27')],
      fetchedAt: 1_700_000_000_000,
    });
    server.use(
      http.get(apiUrl('/api/agricultural-activities'), () =>
        HttpResponse.error(),
      ),
    );

    const { result } = render({ view: 'semana', week: '2026-10-26' }, userId);

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.neverLoaded).toBe(false);
    expect(result.current.missingMonths).toEqual(['2026-11']);
    expect(result.current.items.map(({ activity }) => activity.id)).toEqual([
      'in-oct',
    ]);
    expect(result.current.savedAt).toBe(1_700_000_000_000);
  });
});
