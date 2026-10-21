import { screen, waitFor, within } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildAgriculturalActivity,
  buildAssignee,
  buildFarm,
  buildPlot,
  buildSession,
} from '@/test/factories';
import {
  activityAssigneesHandler,
  apiUrl,
  farmsHandler,
  plotsHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { resetLocation, router } from '@/test/router';
import { server } from '@/test/server';

import { ActivityCalendarScreen } from './activity-calendar-screen';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);
vi.setConfig({ testTimeout: 20_000 });

// Jueves 22 de octubre de 2026, a mediodía en Bogotá.
const NOW = new Date('2026-10-22T17:00:00Z');
const ORIGIN = '%2Fsanidad%3Fparcela%3Dpl1';

let userId: string;
let urls: string[];
let posted: Record<string, unknown>[];

beforeEach(() => {
  userId = `schedule-link-${crypto.randomUUID()}`;
  urls = [];
  posted = [];
  resetLocation();
  router.replace.mockClear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  server.use(
    activityAssigneesHandler([
      buildAssignee({ id: 'u2', full_name: 'Otra cuenta' }),
    ]),
    http.get(apiUrl('/api/agricultural-activities'), () =>
      HttpResponse.json({ results: [] }),
    ),
    farmsHandler([buildFarm({ id: 'f1', name: 'La Esperanza' })]),
    plotsHandler([buildPlot({ id: 'pl1', code: 'P-01' })]),
    http.post(apiUrl('/api/agricultural-activities'), async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      posted.push(body);
      return HttpResponse.json(buildAgriculturalActivity(body), {
        status: 201,
      });
    }),
  );
});

afterEach(() => {
  vi.useRealTimers();
});

function renderScreen(
  searchParams: string,
  permissions: string[] = [
    PERMISSIONS.ACTIVITIES_VIEW,
    PERMISSIONS.ACTIVITIES_ADD,
  ],
) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions }),
  );
  renderWithProviders(<ActivityCalendarScreen />, {
    queryClient,
    searchParams,
    onUrlUpdate: ({ queryString }) => urls.push(queryString),
  });
}

const LINK = `?mes=2026-10&programar=monitoreo&finca=f1&parcela=pl1&origen=${ORIGIN}`;

describe('a monitoring to schedule in the calendar URL', () => {
  it('opens the schedule form with the monitoring, the farm and the plot, and takes the parameters out of the URL', async () => {
    renderScreen(LINK);

    const dialog = await screen.findByRole(
      'dialog',
      { name: /Programar monitoreo/ },
      { timeout: 5000 },
    );

    expect(within(dialog).queryByLabelText('Tipo de actividad')).toBeNull();
    expect(
      await within(dialog).findByRole('combobox', { name: 'Finca' }),
    ).toHaveValue('F01 · La Esperanza');
    expect(
      await within(dialog).findByRole('combobox', { name: 'Parcela' }),
    ).toHaveValue('P-01 · 2,4 ha');
    await waitFor(() => expect(urls.at(-1)).toBe('?mes=2026-10'));
  });

  it('goes back to where it came from when it is cancelled', async () => {
    renderScreen(LINK);
    const dialog = await screen.findByRole(
      'dialog',
      { name: /Programar monitoreo/ },
      { timeout: 5000 },
    );

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancelar' }),
    );

    expect(router.replace).toHaveBeenCalledWith('/sanidad?parcela=pl1');
  });

  it('goes back and says it was scheduled when it is saved', async () => {
    renderScreen(LINK);
    const dialog = await screen.findByRole(
      'dialog',
      { name: /Programar monitoreo/ },
      { timeout: 5000 },
    );
    fireEvent.change(within(dialog).getByLabelText('Fecha programada'), {
      target: { value: '2026-10-25' },
    });
    await within(dialog).findByRole(
      'option',
      { name: 'Otra cuenta' },
      { timeout: 5000 },
    );
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Responsable'),
      'Otra cuenta',
    );

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Guardar' }),
    );

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/sanidad?parcela=pl1'),
    );
    expect(posted[0]).toMatchObject({
      plot_id: 'pl1',
      activity_type: 'phytosanitary_monitoring',
      scheduled_date: '2026-10-25',
    });
    expect((await screen.findAllByText(/programada/i)).length).toBeGreaterThan(
      0,
    );
  });

  it('stays in the calendar when it comes from nowhere', async () => {
    renderScreen('?mes=2026-10&programar=monitoreo');
    const dialog = await screen.findByRole(
      'dialog',
      { name: /Programar monitoreo/ },
      { timeout: 5000 },
    );

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancelar' }),
    );

    expect(router.replace).not.toHaveBeenCalled();
  });

  it('does not go to an address that is not of the app', async () => {
    renderScreen(
      '?mes=2026-10&programar=monitoreo&origen=https%3A%2F%2Fotro.sitio',
    );
    const dialog = await screen.findByRole(
      'dialog',
      { name: /Programar monitoreo/ },
      { timeout: 5000 },
    );

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancelar' }),
    );

    expect(router.replace).not.toHaveBeenCalled();
  });

  it('says so instead of opening the form to who cannot schedule', async () => {
    renderScreen(LINK, [PERMISSIONS.ACTIVITIES_VIEW]);

    expect(
      await screen.findByText('No tienes permiso para programar actividades'),
    ).toBeVisible();
    expect(
      screen.queryByRole('dialog', { name: /Programar monitoreo/ }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(urls.at(-1)).toBe('?mes=2026-10'));
  });

  it('ignores other values of the parameter', async () => {
    renderScreen('?mes=2026-10&programar=otra-cosa');

    await screen.findByRole('heading', { name: 'Actividades' });
    expect(
      screen.queryByRole('dialog', { name: /Programar monitoreo/ }),
    ).not.toBeInTheDocument();
  });
});
