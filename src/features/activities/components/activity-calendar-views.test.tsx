import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIsDesktop } from '@/hooks/use-is-desktop';
import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildAgriculturalActivity,
  buildAssignee,
  buildSession,
} from '@/test/factories';
import {
  activityAssigneesHandler,
  agriculturalActivitiesHandler,
  apiUrl,
  farmsHandler,
  pendingActivitiesHandler,
  plotsHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { ActivityCalendarScreen } from './activity-calendar-screen';

vi.mock('@/hooks/use-is-desktop');

// Jueves 22 de octubre de 2026, a mediodía en Bogotá.
const NOW = new Date('2026-10-22T17:00:00Z');

let userId: string;
let urls: string[];

beforeEach(() => {
  userId = `activity-views-${crypto.randomUUID()}`;
  urls = [];
  vi.mocked(useIsDesktop).mockReturnValue(false);
  server.use(activityAssigneesHandler([]));
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderScreen({
  searchParams = '',
  user = {} as Parameters<typeof buildSession>[0],
} = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: userId,
      permissions: [PERMISSIONS.ACTIVITIES_VIEW, PERMISSIONS.ACTIVITIES_ADD],
      ...user,
    }),
  );
  return renderWithProviders(<ActivityCalendarScreen />, {
    queryClient,
    searchParams,
    onUrlUpdate: ({ queryString }) => urls.push(queryString),
  });
}

const plotOf = (
  id: string,
  code: string,
  farm = 'f1',
  farmName = 'La Esperanza',
) => ({
  id,
  code,
  is_active: true,
  farm: { id: farm, name: farmName, is_active: true },
});

const activity = (
  id: string,
  scheduled_date: string,
  overrides: Parameters<typeof buildAgriculturalActivity>[0] = {},
) => buildAgriculturalActivity({ id, scheduled_date, ...overrides });

const october = [
  activity('over', '2026-10-10', {
    plot: plotOf('p1', 'P-01'),
    activity_type: 'pruning',
  }),
  activity('late', '2026-10-21', {
    plot: plotOf('p2', 'P-02'),
    activity_type: 'irrigation',
    assignee: buildAssignee({ id: 'u2', full_name: 'Luis Rincón' }),
  }),
  activity('soon', '2026-10-26', {
    plot: plotOf('p1', 'P-01'),
    activity_type: 'fertilization',
  }),
  activity('done', '2026-10-05', {
    plot: plotOf('p3', 'P-01', 'f2', 'El Paraíso'),
    status: 'done',
    state: 'done',
    done_date: '2026-10-05',
  }),
];

const cards = () =>
  screen.queryAllByRole('button', {
    name: /Poda|Riego|Fertilización|Monitoreo|Control|Otro|Limpieza|Inventario/,
  });

describe('the views of the calendar', () => {
  it('opens on the list by days in a phone', async () => {
    server.use(agriculturalActivitiesHandler(october));

    renderScreen();

    expect(
      await screen.findByRole('region', { name: 'sábado 10 de octubre' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows a compact month with the agenda of today in a phone', async () => {
    server.use(agriculturalActivitiesHandler(october));

    renderScreen({ searchParams: '?vista=mes' });

    expect(
      await screen.findByRole('grid', {
        name: 'Calendario de octubre de 2026',
      }),
    ).toBeInTheDocument();
    const agenda = screen.getByRole('region', { name: /jueves 22 de octubre/ });
    expect(
      within(agenda).getByText('Sin actividades este día'),
    ).toBeInTheDocument();
  });

  it('changes the agenda when a day of the compact month is touched, and keeps it in the address', async () => {
    server.use(agriculturalActivitiesHandler(october));
    renderScreen({ searchParams: '?vista=mes' });

    await userEvent.click(
      await screen.findByRole('gridcell', { name: /miércoles 21 de octubre/ }),
    );

    const agenda = await screen.findByRole('region', {
      name: /miércoles 21 de octubre/,
    });
    expect(within(agenda).getByText('1 actividad')).toBeInTheDocument();
    expect(urls.at(-1)).toContain('dia=2026-10-21');
  });

  it('opens on the day of the address', async () => {
    server.use(agriculturalActivitiesHandler(october));

    renderScreen({ searchParams: '?vista=mes&dia=2026-10-10' });

    expect(
      await screen.findByRole('region', { name: /sábado 10 de octubre/ }),
    ).toBeInTheDocument();
  });

  it('schedules on the chosen day from its agenda', async () => {
    server.use(
      agriculturalActivitiesHandler(october),
      farmsHandler([]),
      plotsHandler([]),
    );
    renderScreen({ searchParams: '?vista=mes&dia=2026-10-28' });
    const agenda = await screen.findByRole('region', {
      name: /miércoles 28 de octubre/,
    });

    await userEvent.click(
      within(agenda).getByRole('button', { name: 'Programar' }),
    );

    expect(
      within(await screen.findByRole('dialog')).getByLabelText(
        'Fecha programada',
      ),
    ).toHaveValue('2026-10-28');
  });

  it('opens on the month grid in a desktop', async () => {
    vi.mocked(useIsDesktop).mockReturnValue(true);
    server.use(agriculturalActivitiesHandler(october));

    renderScreen();

    expect(
      await screen.findByRole('grid', {
        name: 'Calendario de octubre de 2026',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mes' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('changes the view and keeps it in the address', async () => {
    server.use(agriculturalActivitiesHandler(october));
    renderScreen();
    await screen.findByRole('region', { name: 'sábado 10 de octubre' });

    await userEvent.click(screen.getByRole('button', { name: 'Semana' }));

    expect(
      await screen.findByRole('region', {
        name: 'Semana del 19 al 25 de octubre',
      }),
    ).toBeInTheDocument();
    expect(urls.at(-1)).toContain('vista=semana');
  });

  it('shows the week that crosses two months with the activities of both', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      http.get(apiUrl('/api/agricultural-activities'), ({ request }) => {
        const params = new URL(request.url).searchParams;
        requests.push(params);
        return HttpResponse.json({
          results:
            params.get('from') === '2026-10-01'
              ? [activity('oct', '2026-10-27')]
              : [
                  activity('nov', '2026-11-01', {
                    activity_type: 'irrigation',
                  }),
                ],
        });
      }),
    );

    renderScreen({ searchParams: '?vista=semana&semana=2026-10-26' });

    const week = await screen.findByRole('region', {
      name: 'Semana del 26 de octubre al 1 de noviembre',
    });
    await waitFor(() =>
      expect(
        within(week).getAllByRole('button', { name: /parcela/ }),
      ).toHaveLength(2),
    );
    expect(requests.map((request) => request.get('from'))).toEqual(
      expect.arrayContaining(['2026-10-01', '2026-11-01']),
    );
  });

  it('moves the week with the arrows and comes back to this one', async () => {
    server.use(agriculturalActivitiesHandler([]));
    renderScreen({ searchParams: '?vista=semana' });
    await screen.findByRole('region', {
      name: 'Semana del 19 al 25 de octubre',
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Semana siguiente' }),
    );
    expect(
      await screen.findByRole('region', {
        name: 'Semana del 26 de octubre al 1 de noviembre',
      }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Hoy' }));
    expect(
      await screen.findByRole('region', {
        name: 'Semana del 19 al 25 de octubre',
      }),
    ).toBeInTheDocument();
  });

  it('shows the plots with their activities in the by-plot view', async () => {
    server.use(agriculturalActivitiesHandler(october));

    renderScreen({ searchParams: '?vista=parcela' });

    const second = await screen.findByRole('article', { name: 'P-02' });
    expect(within(second).getByText('1 actividad')).toBeInTheDocument();
    // P-01 existe en dos fincas: son dos tarjetas, cada una bajo la suya.
    const firsts = screen.getAllByRole('article', { name: 'P-01' });
    expect(firsts.map((card) => card.textContent)).toEqual([
      expect.stringContaining('1 actividad'),
      expect.stringContaining('2 actividades'),
    ]);
    expect(
      screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent),
    ).toEqual(['El Paraíso', 'La Esperanza']);
  });

  it('shows the plots as a table in a desktop', async () => {
    vi.mocked(useIsDesktop).mockReturnValue(true);
    server.use(agriculturalActivitiesHandler(october));

    renderScreen({ searchParams: '?vista=parcela' });

    expect(
      await screen.findByRole('table', {
        name: 'Actividades por parcela, octubre de 2026',
      }),
    ).toBeInTheDocument();
  });

  it('shows what is pending, however old, and asks for it apart from the month', async () => {
    const monthRequests: URLSearchParams[] = [];
    const pendingRequests: URLSearchParams[] = [];
    server.use(
      agriculturalActivitiesHandler([], monthRequests),
      pendingActivitiesHandler(
        [
          activity('old', '2026-03-02'),
          activity('late', '2026-10-21'),
          activity('soon', '2026-10-30'),
        ],
        pendingRequests,
      ),
    );

    renderScreen({ searchParams: '?vista=pendientes' });

    expect(
      await screen.findByRole('heading', { name: 'Vencidas 1' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Retrasadas 1' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Próximos 14 días 1' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Vencida · 234 días')).toBeInTheDocument();
    expect(pendingRequests[0].get('through')).toBe('2027-01-20');
    expect(monthRequests).toEqual([]);
    expect(
      screen.queryByRole('button', { name: 'Mes anterior' }),
    ).not.toBeInTheDocument();
  });

  it('lets the person choose how many days ahead to look, in the address', async () => {
    server.use(
      pendingActivitiesHandler([
        activity('far', '2026-11-30'),
        activity('near', '2026-10-30'),
      ]),
    );
    renderScreen({ searchParams: '?vista=pendientes' });
    expect(
      await screen.findByRole('heading', { name: 'Próximos 14 días 1' }),
    ).toBeInTheDocument();

    await userEvent.selectOptions(
      screen.getByLabelText('Mirar hacia adelante'),
      '60',
    );

    expect(
      await screen.findByRole('heading', { name: 'Próximos 60 días 2' }),
    ).toBeInTheDocument();
    expect(urls.at(-1)).toContain('dias=60');
  });

  it('says all is up to date when nothing is pending', async () => {
    server.use(pendingActivitiesHandler([]));

    renderScreen({ searchParams: '?vista=pendientes' });

    expect(
      await screen.findByRole('heading', { name: 'Todo al día' }),
    ).toBeInTheDocument();
  });

  it('shows the pending view without a network from the saved copy', async () => {
    await getOfflineDb(userId).cache.put({
      key: 'agricultural-activities:pending',
      value: [activity('late', '2026-10-21')],
      fetchedAt: 1_700_000_000_000,
    });
    server.use(
      http.get(apiUrl('/api/agricultural-activities/pending'), () =>
        HttpResponse.error(),
      ),
    );

    renderScreen({ searchParams: '?vista=pendientes' });

    expect(await screen.findByText('Retrasada · 1 día')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Sin conexión');
  });

  it('says that the pending view never loaded needs a connection', async () => {
    server.use(
      http.get(apiUrl('/api/agricultural-activities/pending'), () =>
        HttpResponse.error(),
      ),
    );

    renderScreen({ searchParams: '?vista=pendientes' });

    expect(
      await screen.findByText(
        'Necesitas conexión para ver las actividades pendientes.',
      ),
    ).toBeInTheDocument();
  });

  it('falls back to the initial view with a view it does not know', async () => {
    server.use(agriculturalActivitiesHandler(october));

    renderScreen({ searchParams: '?vista=zzz' });

    expect(
      await screen.findByRole('region', { name: 'sábado 10 de octubre' }),
    ).toBeInTheDocument();
  });

  it('keeps the legend in sight', async () => {
    server.use(agriculturalActivitiesHandler(october));

    renderScreen();

    expect(
      await screen.findByRole('region', { name: 'Leyenda de estados' }),
    ).toBeInTheDocument();
  });
});

describe('scheduling from the calendar', () => {
  beforeEach(() => {
    server.use(farmsHandler([]), plotsHandler([]));
  });

  it('opens the form on the day of an empty day of the month grid', async () => {
    vi.mocked(useIsDesktop).mockReturnValue(true);
    server.use(agriculturalActivitiesHandler(october));
    renderScreen();

    await userEvent.click(
      await screen.findByRole('gridcell', { name: /viernes 23 de octubre/ }),
    );

    const form = await screen.findByRole('dialog');
    expect(within(form).getByLabelText('Fecha programada')).toHaveValue(
      '2026-10-23',
    );
  });

  it('opens the form on the day chosen in the week', async () => {
    server.use(agriculturalActivitiesHandler([]));
    renderScreen({ searchParams: '?vista=semana' });

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Programar una actividad el sábado 24 de octubre',
      }),
    );

    expect(
      within(await screen.findByRole('dialog')).getByLabelText(
        'Fecha programada',
      ),
    ).toHaveValue('2026-10-24');
  });

  it('opens the form with the plot and the day of an empty cell of the by-plot table', async () => {
    vi.mocked(useIsDesktop).mockReturnValue(true);
    server.use(agriculturalActivitiesHandler(october));
    renderScreen({ searchParams: '?vista=parcela' });
    const row = (await screen.findAllByRole('row', { name: /P-02/ }))[0];

    await userEvent.click(within(row).getAllByRole('cell')[27]);

    expect(
      within(await screen.findByRole('dialog')).getByLabelText(
        'Fecha programada',
      ),
    ).toHaveValue('2026-10-28');
  });

  it('does not offer it without the permission', async () => {
    vi.mocked(useIsDesktop).mockReturnValue(true);
    server.use(agriculturalActivitiesHandler(october));
    renderScreen({ user: { permissions: [PERMISSIONS.ACTIVITIES_VIEW] } });

    await userEvent.click(
      await screen.findByRole('gridcell', { name: /viernes 23 de octubre/ }),
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not offer it without a connection', async () => {
    vi.mocked(useIsDesktop).mockReturnValue(true);
    await getOfflineDb(userId).cache.put({
      key: 'agricultural-activities:2026-10',
      value: october,
      fetchedAt: 1_700_000_000_000,
    });
    server.use(
      http.get(apiUrl('/api/agricultural-activities'), () =>
        HttpResponse.error(),
      ),
    );
    renderScreen();

    await userEvent.click(
      await screen.findByRole('gridcell', { name: /viernes 23 de octubre/ }),
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps an empty month as an empty calendar, with a note and days that still schedule', async () => {
    vi.mocked(useIsDesktop).mockReturnValue(true);
    server.use(agriculturalActivitiesHandler([]));
    renderScreen();

    expect(await screen.findByRole('grid')).toBeInTheDocument();
    expect(
      screen.getByText('No hay actividades programadas en este periodo.'),
    ).toBeInTheDocument();
  });
});

// En una pantalla angosta los filtros están detrás de su botón.
const openFilters = () =>
  userEvent.click(screen.getByRole('button', { name: /^Filtros/ }));

describe('the filters of the calendar', () => {
  it('keeps the filters behind a button in a phone', async () => {
    server.use(agriculturalActivitiesHandler(october));
    renderScreen();
    await screen.findByRole('region', { name: 'sábado 10 de octubre' });
    expect(screen.getByLabelText('Parcela')).not.toBeVisible();

    await openFilters();

    expect(screen.getByLabelText('Parcela')).toBeVisible();
  });

  it('shows the filters without a button in a desktop', async () => {
    vi.mocked(useIsDesktop).mockReturnValue(true);
    server.use(agriculturalActivitiesHandler(october));
    renderScreen();
    await screen.findByRole('grid');

    expect(
      screen.queryByRole('button', { name: /^Filtros/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Parcela')).toBeVisible();
  });

  it('says on the button how many filters are set', async () => {
    server.use(agriculturalActivitiesHandler(october));
    renderScreen({ searchParams: '?parcela=p2&finca=f1' });
    await screen.findByRole('region', { name: 'miércoles 21 de octubre' });

    expect(screen.getByRole('button', { name: /^Filtros/ })).toHaveTextContent(
      '2',
    );
  });

  it('filters by farm and offers only the plots of that farm', async () => {
    server.use(
      agriculturalActivitiesHandler(october),
      activityAssigneesHandler([]),
    );
    renderScreen();
    await screen.findByRole('region', { name: 'sábado 10 de octubre' });

    await openFilters();
    await userEvent.selectOptions(screen.getByLabelText('Finca'), 'f2');

    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: 'sábado 10 de octubre' }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole('region', { name: 'lunes 5 de octubre' }),
    ).toBeInTheDocument();
    expect(urls.at(-1)).toContain('finca=f2');
    expect(
      within(screen.getByLabelText('Parcela'))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Todas las parcelas', 'P-01']);
  });

  const loaded = () =>
    screen.findByRole('region', { name: 'sábado 10 de octubre' });

  it('filters by plot, in the address', async () => {
    server.use(
      agriculturalActivitiesHandler(october),
      activityAssigneesHandler([]),
    );
    renderScreen();
    await loaded();

    await userEvent.selectOptions(screen.getByLabelText('Parcela'), 'p2');

    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: 'sábado 10 de octubre' }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole('region', { name: 'miércoles 21 de octubre' }),
    ).toBeInTheDocument();
    expect(urls.at(-1)).toContain('parcela=p2');
  });

  it('reads the filters of the address', async () => {
    server.use(
      agriculturalActivitiesHandler(october),
      activityAssigneesHandler([]),
    );

    renderScreen({ searchParams: '?estado=overdue' });

    expect(
      await screen.findByRole('region', { name: 'sábado 10 de octubre' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'miércoles 21 de octubre' }),
    ).not.toBeInTheDocument();
    expect(
      within(
        screen.getByRole('group', { name: 'Estados del periodo' }),
      ).getByRole('button', { name: /Vencida/ }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps only the activities assigned to the person with the shortcut', async () => {
    server.use(
      agriculturalActivitiesHandler([
        activity('mine', '2026-10-21', {
          assignee: buildAssignee({ id: userId, full_name: 'Yo' }),
        }),
        activity('other', '2026-10-26', {
          assignee: buildAssignee({ id: 'u2', full_name: 'Luis Rincón' }),
        }),
      ]),
      activityAssigneesHandler([]),
    );
    renderScreen();
    await screen.findByRole('region', { name: 'miércoles 21 de octubre' });

    await openFilters();
    await userEvent.click(
      screen.getByRole('button', { name: 'Asignadas a mí' }),
    );

    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: 'lunes 26 de octubre' }),
      ).not.toBeInTheDocument(),
    );
    expect(urls.at(-1)).toContain(`responsable=${userId}`);
    expect(
      screen.getByRole('button', { name: 'Asignadas a mí' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('says no activity meets the filters and clears them', async () => {
    server.use(
      agriculturalActivitiesHandler(october),
      activityAssigneesHandler([]),
    );
    renderScreen({ searchParams: '?parcela=p2&estado=done' });

    expect(
      await screen.findByText('Ninguna actividad cumple los filtros'),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getAllByRole('button', { name: 'Limpiar filtros' })[0],
    );

    expect(
      await screen.findByRole('region', { name: 'sábado 10 de octubre' }),
    ).toBeInTheDocument();
    expect(urls.at(-1)).toBe('');
  });

  it('filters while there is no network, on the saved copy', async () => {
    await getOfflineDb(userId).cache.put({
      key: 'agricultural-activities:2026-10',
      value: october,
      fetchedAt: 1_700_000_000_000,
    });
    server.use(
      http.get(apiUrl('/api/agricultural-activities'), () =>
        HttpResponse.error(),
      ),
      http.get(apiUrl('/api/agricultural-activities/assignees'), () =>
        HttpResponse.error(),
      ),
    );
    renderScreen({ searchParams: '?parcela=p2' });

    expect(
      await screen.findByRole('region', { name: 'miércoles 21 de octubre' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'sábado 10 de octubre' }),
    ).not.toBeInTheDocument();
  });

  it('applies the state of the summary as a filter and keeps its numbers', async () => {
    server.use(
      agriculturalActivitiesHandler(october),
      activityAssigneesHandler([]),
    );
    renderScreen();
    await screen.findByRole('region', { name: 'sábado 10 de octubre' });
    const summary = screen.getByRole('group', { name: 'Estados del periodo' });
    const state = (name: string) =>
      within(summary).getByRole('button', { name: new RegExp(name) });
    expect(state('Programada')).toHaveTextContent('1');
    expect(state('Vencida')).toHaveTextContent('1');

    await userEvent.click(state('Vencida'));

    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: 'miércoles 21 de octubre' }),
      ).not.toBeInTheDocument(),
    );
    expect(urls.at(-1)).toContain('estado=overdue');
    expect(state('Programada')).toHaveTextContent('1');
    expect(state('Vencida')).toHaveAttribute('aria-pressed', 'true');
    expect(cards()).toHaveLength(1);

    await userEvent.click(state('Vencida'));
    await waitFor(() =>
      expect(
        screen.getByRole('region', { name: 'miércoles 21 de octubre' }),
      ).toBeInTheDocument(),
    );
  });
});

describe('the technical account', () => {
  const technical = { is_superuser: true, producer_id: null };

  it('sees every producer and can choose one', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      agriculturalActivitiesHandler(october, requests),
      http.get(apiUrl('/api/producers'), () =>
        HttpResponse.json({
          count: 0,
          next: null,
          previous: null,
          results: [],
        }),
      ),
    );

    renderScreen({ user: technical });

    expect(await screen.findByLabelText('Productor')).toBeInTheDocument();
    await screen.findByRole('region', { name: 'sábado 10 de octubre' });
    expect(requests[0].has('producer')).toBe(false);
  });

  it('reads what belongs to the producer chosen', async () => {
    const requests: URLSearchParams[] = [];
    const assigneeRequests: URLSearchParams[] = [];
    server.use(
      agriculturalActivitiesHandler(october, requests),
      activityAssigneesHandler(
        [buildAssignee({ id: 'u9', full_name: 'Marta Peña' })],
        assigneeRequests,
      ),
      http.get(apiUrl('/api/producers/p2'), () =>
        HttpResponse.json({
          id: 'p2',
          first_name: 'Otra',
          last_name: 'Productora',
          member_code: 'ASO-002',
        }),
      ),
      http.get(apiUrl('/api/producers'), () =>
        HttpResponse.json({
          count: 0,
          next: null,
          previous: null,
          results: [],
        }),
      ),
    );

    renderScreen({ user: technical, searchParams: '?productor=p2' });

    await screen.findByRole('region', { name: 'sábado 10 de octubre' });
    expect(requests[0].get('producer')).toBe('p2');
    await waitFor(() =>
      expect(assigneeRequests[0]?.get('producer')).toBe('p2'),
    );
    await openFilters();
    expect(
      await screen.findByRole('option', { name: 'Marta Peña' }),
    ).toBeInTheDocument();
  });

  it('ignores a producer in the address for any other account', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      agriculturalActivitiesHandler(october, requests),
      activityAssigneesHandler([]),
    );

    renderScreen({ searchParams: '?productor=p2' });

    await screen.findByRole('region', { name: 'sábado 10 de octubre' });
    expect(requests[0].has('producer')).toBe(false);
    expect(screen.queryByLabelText('Productor')).not.toBeInTheDocument();
  });
});
