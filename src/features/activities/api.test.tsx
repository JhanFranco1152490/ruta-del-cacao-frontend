import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { getOfflineDb } from '@/lib/offline/db';
import {
  apiError,
  buildAgriculturalActivity,
  buildAssignee,
} from '@/test/factories';
import {
  activityAssigneesHandler,
  agriculturalActivitiesHandler,
  apiUrl,
} from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useActivitiesOfMonth, useActivity, useActivityAssignees } from './api';

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

describe('useActivity', () => {
  it('reads one activity by its id', async () => {
    server.use(
      http.get(apiUrl('/api/agricultural-activities/a1'), () =>
        HttpResponse.json(buildAgriculturalActivity({ version: 4 })),
      ),
    );

    const { result } = render(() => useActivity(newUser(), 'a1'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.version).toBe(4);
    expect(result.current.data?.savedAt).toBeUndefined();
  });

  it('finds it in the newest saved month without a network', async () => {
    const userId = newUser();
    // Reprogramada de octubre a noviembre: la copia de octubre quedó vieja.
    await saveMonth(userId, 'agricultural-activities:2026-10', [
      buildAgriculturalActivity({ scheduled_date: '2026-10-20' }),
    ]);
    await saveMonth(
      userId,
      'agricultural-activities:2026-11',
      [
        buildAgriculturalActivity({ id: 'a2' }),
        buildAgriculturalActivity({ scheduled_date: '2026-11-03' }),
      ],
      1_700_000_500_000,
    );
    // La copia de los responsables no es un mes: una cuenta con ese id no se confunde.
    await saveMonth(
      userId,
      'agricultural-activity-assignees',
      [buildAssignee({ id: 'a1' })],
      1_700_000_900_000,
    );
    server.use(offline('/api/agricultural-activities/a1'));

    const { result } = render(() => useActivity(userId, 'a1'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.scheduled_date).toBe('2026-11-03');
    expect(result.current.data?.savedAt).toBe(1_700_000_500_000);
  });

  it('fails without a network when no saved month has it', async () => {
    server.use(offline('/api/agricultural-activities/a1'));

    const { result } = render(() => useActivity(newUser(), 'a1'));

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('says that the activity does not exist instead of using a copy', async () => {
    const userId = newUser();
    await saveMonth(userId, 'agricultural-activities:2026-10', [
      buildAgriculturalActivity(),
    ]);
    server.use(
      http.get(apiUrl('/api/agricultural-activities/a1'), () =>
        apiError(404, 'not_found', 'La actividad no existe.'),
      ),
    );

    const { result } = render(() => useActivity(userId, 'a1'));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).status).toBe(404);
  });
});

describe('useActivityAssignees', () => {
  it('reads the accounts of the own producer and keeps a copy', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(activityAssigneesHandler([buildAssignee()], requests));

    const { result } = render(() => useActivityAssignees(userId, null));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].toString()).toBe('');
    expect(result.current.data?.data).toEqual([buildAssignee()]);
    expect(
      await getOfflineDb(userId).cache.get('agricultural-activity-assignees'),
    ).toBeDefined();
  });

  it('asks for the chosen producer and keeps its copy apart', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(activityAssigneesHandler([], requests));

    const { result } = render(() => useActivityAssignees(userId, 'p2'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].get('producer')).toBe('p2');
    expect(
      await getOfflineDb(userId).cache.get(
        'agricultural-activity-assignees:producer:p2',
      ),
    ).toBeDefined();
  });

  it('asks for nothing while it is turned off', () => {
    const requests: URLSearchParams[] = [];
    server.use(activityAssigneesHandler([], requests));

    const { result } = render(() =>
      useActivityAssignees(newUser(), null, { enabled: false }),
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(requests).toHaveLength(0);
  });
});
