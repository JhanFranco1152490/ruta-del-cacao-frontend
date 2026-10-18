import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { getOfflineDb } from '@/lib/offline/db';
import {
  apiError,
  buildAgriculturalActivity,
  buildAssignee,
} from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useActivity } from './activity-read';
import { ApiError } from './errors';

const render = <T,>(hook: () => T) => {
  const client = createTestQueryClient();
  return renderHook(hook, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
};

const newUser = () => `activity-read-${crypto.randomUUID()}`;

// Un fetch que no recibe respuesta, como sin red.
const offline = (path: string) =>
  http.get(apiUrl(path), () => HttpResponse.error());

const saveMonth = (
  userId: string,
  key: string,
  value: unknown[],
  fetchedAt = 1_700_000_000_000,
) => getOfflineDb(userId).cache.put({ key, value, fetchedAt });

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
