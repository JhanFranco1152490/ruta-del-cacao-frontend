import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildAgriculturalActivity,
  buildFarm,
  buildPestDisease,
  buildPlot,
  buildSession,
} from '@/test/factories';
import {
  apiUrl,
  farmsHandler,
  pestsDiseasesHandler,
  plotsHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { mockLocation, resetLocation } from '@/test/router';
import { server } from '@/test/server';

import { HealthScreen } from './health-screen';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

type Activity = components['schemas']['AgriculturalActivity'];

const monitoring = (
  id: string,
  code: string,
  farm: { id: string; name: string },
  done: string,
): Activity =>
  buildAgriculturalActivity({
    id,
    activity_type: 'phytosanitary_monitoring',
    status: 'done',
    done_date: done,
    plot: {
      id: `pl-${code}`,
      code,
      is_active: true,
      farm: { ...farm, is_active: true },
    },
    monitoring: {
      sampling_unit: 'trees',
      evaluated_units: 50,
      sampling_method: null,
      notes: null,
      no_presence: true,
      detections: [],
      detections_without_control: 0,
      evidence_count: 0,
    },
  });

const FARM_A = { id: 'f1', name: 'La Esperanza' };
const FARM_B = { id: 'f2', name: 'El Retiro' };
const first = monitoring('m1', 'P-01', FARM_A, '2026-10-19');
const second = monitoring('m2', 'P-02', FARM_B, '2026-10-12');

const page = (
  results: Activity[],
  extra: Partial<components['schemas']['PhytosanitaryHistory']> = {},
) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
  summary: [],
  ...extra,
});

let requests: URLSearchParams[];
let answer: () => ReturnType<typeof page>;

beforeEach(() => {
  resetLocation();
  requests = [];
  answer = () => page([first, second]);
  server.use(
    http.get(apiUrl('/api/phytosanitary-history'), ({ request }) => {
      requests.push(new URL(request.url).searchParams);
      return HttpResponse.json(answer());
    }),
    http.get(apiUrl('/api/phytosanitary-detections/without-control'), () =>
      HttpResponse.json({ results: [] }),
    ),
    farmsHandler([
      buildFarm({ id: 'f1', name: 'La Esperanza' }),
      buildFarm({ id: 'f2', name: 'El Retiro' }),
    ]),
    plotsHandler([
      buildPlot({ id: 'pl-P-01', code: 'P-01' }),
      buildPlot({
        id: 'pl-P-02',
        code: 'P-02',
        farm: {
          id: 'f2',
          name: 'El Retiro',
          is_active: true,
          producer: buildPlot().farm.producer,
        },
      }),
    ]),
    pestsDiseasesHandler([
      buildPestDisease({ id: 'monilia', name: 'Monilia' }),
      buildPestDisease({ id: 'trips', name: 'Trips', kind: 'pest' }),
    ]),
  );
});

const SCHEDULER = [
  PERMISSIONS.ACTIVITIES_VIEW,
  PERMISSIONS.ACTIVITIES_ADD,
  PERMISSIONS.ACTIVITIES_COMPLETE,
];

function renderScreen(
  searchParams = '',
  permissions: string[] = SCHEDULER,
  queryClient = createTestQueryClient(),
) {
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: `health-${crypto.randomUUID()}`, permissions }),
  );
  mockLocation.path = '/sanidad';
  mockLocation.search = searchParams;
  renderWithProviders(<HealthScreen />, { queryClient, searchParams });
  return queryClient;
}

const monitorings = () =>
  screen.findByRole('list', { name: 'Monitoreos' }, { timeout: 5000 });

describe('HealthScreen', () => {
  it('lists the monitorings of all the plots without choosing one first', async () => {
    renderScreen();

    const list = await monitorings();

    const items = within(list).getAllByRole('listitem', { name: '' });
    expect(list).toHaveTextContent('P-01 · La Esperanza');
    expect(list).toHaveTextContent('P-02 · El Retiro');
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(requests[0].toString()).toBe('');
  });

  it('opens already filtered by the plot that comes in the URL', async () => {
    renderScreen('?parcela=pl-P-01');

    await monitorings();

    await waitFor(() =>
      expect(requests.some((query) => query.get('plot') === 'pl-P-01')).toBe(
        true,
      ),
    );
  });

  it('shows the summary by pest only when a plot is chosen', async () => {
    answer = () =>
      page([first], {
        summary: [
          {
            pest_disease: {
              id: 'monilia',
              name: 'Monilia',
              kind: 'disease',
              is_active: true,
            },
            other_description: null,
            sampling_unit: 'trees',
            latest_incidence: '24.00',
            previous_incidence: '31.00',
            latest_date: '2026-10-19',
          },
        ],
      });
    renderScreen('?parcela=pl-P-01');

    const summary = await screen.findByRole('region', {
      name: 'Resumen por plaga',
    });

    expect(summary).toHaveTextContent('Monilia: 24 % de árboles · antes 31 %');
  });

  it('does not show a summary without a plot', async () => {
    renderScreen();
    await monitorings();

    expect(
      screen.queryByRole('region', { name: 'Resumen por plaga' }),
    ).not.toBeInTheDocument();
  });

  it('filters by farm and by pest, and keeps them in the URL', async () => {
    const onUrlUpdate = vi.fn();
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(
      queryKeys.session(),
      buildSession({ id: 'health-filters', permissions: SCHEDULER }),
    );
    mockLocation.path = '/sanidad';
    renderWithProviders(<HealthScreen />, { queryClient, onUrlUpdate });
    await monitorings();
    await screen.findByRole('option', { name: 'Monilia' });

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Plaga o enfermedad' }),
      'monilia',
    );

    await waitFor(() =>
      expect(
        requests.some((query) => query.get('pest_disease') === 'monilia'),
      ).toBe(true),
    );
    expect(onUrlUpdate.mock.lastCall?.[0].queryString).toContain(
      'plaga=monilia',
    );
  });

  it('says there is nothing yet and offers to schedule the first one', async () => {
    answer = () => page([]);
    renderScreen();

    expect(
      await screen.findByText('Todavía no hay monitoreos registrados'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'Programar monitoreo' }).length,
    ).toBeGreaterThan(0);
  });

  it('says nothing matches the filters and lets clear them', async () => {
    answer = () => page([]);
    renderScreen('?plaga=monilia');

    expect(
      await screen.findByText('No hay monitoreos con estos filtros'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Limpiar filtros' }),
    ).toBeInTheDocument();
  });

  it('paginates and asks for the next page', async () => {
    answer = () => page([first], { count: 45, next: 'http://x/?page=2' });
    renderScreen();
    await monitorings();

    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    await waitFor(() =>
      expect(requests.some((query) => query.get('page') === '2')).toBe(true),
    );
  });

  it('says what a bad period is instead of asking', async () => {
    renderScreen('?desde=2026-10-20&hasta=2026-10-01');

    expect(
      await screen.findByText(
        'La fecha inicial no puede ser posterior a la final',
      ),
    ).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it('shows the last copy with its notice when there is no network', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(queryKeys.health.history({}), {
      data: page([first]),
      savedAt: Date.now(),
    });
    server.use(
      http.get(apiUrl('/api/phytosanitary-history'), () =>
        HttpResponse.error(),
      ),
    );

    renderScreen('', SCHEDULER, queryClient);

    expect(
      await screen.findByText(
        'Sin conexión: estás viendo la última copia del historial.',
      ),
    ).toBeInTheDocument();
  });

  describe('scheduling a monitoring', () => {
    it('goes to the activities form carrying the farm and the plot, and where to come back', async () => {
      renderScreen('?finca=f1&parcela=pl-P-01');
      await monitorings();

      const [link] = screen.getAllByRole('link', {
        name: 'Programar monitoreo',
      });

      const href = link.getAttribute('href') ?? '';
      const url = new URL(href, 'http://app.test');
      expect(url.pathname).toBe('/actividades');
      expect(url.searchParams.get('programar')).toBe('monitoreo');
      expect(url.searchParams.get('finca')).toBe('f1');
      expect(url.searchParams.get('parcela')).toBe('pl-P-01');
      expect(url.searchParams.get('origen')).toBe(
        '/sanidad?finca=f1&parcela=pl-P-01',
      );
    });

    it('is not offered to who cannot schedule', async () => {
      renderScreen('', [PERMISSIONS.ACTIVITIES_VIEW]);
      await monitorings();

      expect(
        screen.queryByRole('link', { name: 'Programar monitoreo' }),
      ).not.toBeInTheDocument();
    });
  });
});
