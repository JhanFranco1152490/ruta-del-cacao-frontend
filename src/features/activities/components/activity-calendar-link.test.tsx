import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { PERMISSIONS } from '@/lib/permissions';
import {
  apiError,
  buildAgriculturalActivity,
  buildSession,
} from '@/test/factories';
import { activityAssigneesHandler, apiUrl } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { activityMonthCacheKey } from '../activity-cache';
import type { AgriculturalActivity } from '../api';
import { ActivityCalendarScreen } from './activity-calendar-screen';

// Jueves 22 de octubre de 2026, a mediodía en Bogotá.
const NOW = new Date('2026-10-22T17:00:00Z');

const pruning = buildAgriculturalActivity({
  id: 'a1',
  activity_type: 'pruning',
  scheduled_date: '2026-10-20',
});
// Reprogramada después de que llegó el aviso: ya no está en octubre.
const moved = buildAgriculturalActivity({
  id: 'a9',
  activity_type: 'irrigation',
  scheduled_date: '2026-11-05',
});

let userId: string;
let urls: string[];

// Las actividades de cada mes que se pide, y cada una sola por su id.
const backend = (activities: AgriculturalActivity[]) => [
  // Antes que la de una actividad por su id, que también calzaría con esta ruta.
  activityAssigneesHandler([]),
  http.get(apiUrl('/api/agricultural-activities'), ({ request }) => {
    const params = new URL(request.url).searchParams;
    const from = params.get('from') ?? '';
    const to = params.get('to') ?? '';
    return HttpResponse.json({
      results: activities.filter(
        ({ scheduled_date }) => scheduled_date >= from && scheduled_date <= to,
      ),
    });
  }),
  http.get(apiUrl('/api/agricultural-activities/:id'), ({ params }) => {
    const found = activities.find(({ id }) => id === params.id);
    return found ? HttpResponse.json(found) : apiError(404, 'not_found');
  }),
];

beforeEach(() => {
  userId = `activity-link-${crypto.randomUUID()}`;
  urls = [];
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderScreen(searchParams: string) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions: [PERMISSIONS.ACTIVITIES_VIEW] }),
  );
  renderWithProviders(<ActivityCalendarScreen />, {
    queryClient,
    searchParams,
    onUrlUpdate: ({ queryString }) => urls.push(queryString),
  });
}

// Pasar a otro mes encadena tres lecturas (el mes, la actividad sola y el mes nuevo).
const detailOf = async (name: string) => {
  const detail = await screen.findByRole('dialog', {}, { timeout: 5000 });
  expect(within(detail).getByRole('heading', { name })).toBeInTheDocument();
  return detail;
};

describe('an activity in the calendar URL', () => {
  it('opens its detail and takes the parameter out of the URL', async () => {
    server.use(...backend([pruning]));
    renderScreen('?mes=2026-10&actividad=a1');

    await detailOf('Poda');
    await waitFor(() => expect(urls.at(-1)).toBe('?mes=2026-10'));
  });

  it('goes to the month of an activity that is no longer in that month', async () => {
    server.use(...backend([pruning, moved]));
    renderScreen('?mes=2026-10&actividad=a9');

    await detailOf('Riego');
    expect(
      screen.getByRole('heading', { name: 'noviembre de 2026' }),
    ).toBeInTheDocument();
  });

  it('says so when the activity no longer exists', async () => {
    server.use(...backend([pruning]));
    renderScreen('?mes=2026-10&actividad=gone');

    expect(
      await screen.findByText('La actividad ya no está disponible'),
    ).toBeVisible();
    // El aviso flotante también es un diálogo: lo que no se abre es el detalle.
    expect(
      screen.queryByRole('heading', { name: 'Poda' }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(urls.at(-1)).toBe('?mes=2026-10'));
  });

  it('opens it from the saved month without a connection', async () => {
    await getOfflineDb(userId).cache.put({
      key: activityMonthCacheKey(null, '2026-10'),
      value: [pruning],
      fetchedAt: 1,
    });
    server.use(
      activityAssigneesHandler([]),
      http.get(apiUrl('/api/agricultural-activities'), () =>
        HttpResponse.error(),
      ),
      http.get(apiUrl('/api/agricultural-activities/:id'), () =>
        HttpResponse.error(),
      ),
    );
    renderScreen('?mes=2026-10&actividad=a1');

    await detailOf('Poda');
  });
});
