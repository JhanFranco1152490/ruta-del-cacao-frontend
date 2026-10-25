import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { OnUrlUpdateFunction } from 'nuqs/adapters/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildDrying,
  buildDryingLog,
  buildFarm,
  buildHarvest,
  buildLot,
  buildSession,
} from '@/test/factories';
import {
  apiUrl,
  csrfHandler,
  dryingsHandler,
  farmsHandler,
  lotsHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { resetLocation, router } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { enqueueLog } from '../log-queue';
import { DryingScreen } from './drying-screen';

const NOW = new Date('2026-10-24T10:00:00-05:00');

const esperanza = { id: 'f1', code: 'F02', name: 'La Esperanza' };
const diviso = { id: 'f2', code: 'F03', name: 'El Diviso' };

const dryingOf = (
  lotId: string,
  code: string,
  farm: typeof esperanza,
  overrides: Parameters<typeof buildDrying>[0] = {},
) =>
  buildDrying({
    lot: { ...buildDrying().lot, id: lotId, code },
    farm,
    ...overrides,
  });

// La primera lleva dos días y una bitácora (la del 23); la segunda empezó hoy y no tiene ninguna.
const dryings = [
  dryingOf('l1', '000123-F02-P05-261014-1', esperanza, {
    logs: [buildDryingLog({ id: 'dl1', moisture_pct: '12.4' })],
  }),
  dryingOf('l2', '000123-F03-P01-261015-1', diviso, {
    facility: { id: 'fc2', name: 'M-02', capacity_kg: '600.0' },
    started_at: '2026-10-24T07:00:00-05:00',
  }),
];

const readyLot = (() => {
  const harvest = buildHarvest();
  return buildLot({
    id: 'l9',
    code: '000123-F02-P05-261016-1',
    status: 'fermented',
    green_weight_kg: '186.0',
    harvest: {
      ...harvest,
      plot: {
        ...harvest.plot,
        farm: { ...esperanza, is_active: true },
      },
    },
  });
})();

const lotHref = (id: string) => `/lotes/detalle?id=${id}`;
const MANAGE = [PERMISSIONS.DRYING_LOG, PERMISSIONS.DRYING_MANAGE];

let userId: string;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  userId = `drying-screen-${crypto.randomUUID()}`;
  resetLocation();
  server.use(
    farmsHandler([buildFarm({ ...esperanza }), buildFarm({ ...diviso })]),
    dryingsHandler(dryings),
    lotsHandler([readyLot]),
  );
});

afterEach(() => {
  vi.useRealTimers();
});

function renderScreen({
  searchParams = '',
  superuser = false,
  permissions = MANAGE,
  onUrlUpdate,
}: {
  searchParams?: string;
  superuser?: boolean;
  permissions?: string[];
  onUrlUpdate?: OnUrlUpdateFunction;
} = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, is_superuser: superuser, permissions }),
  );
  return renderWithProviders(
    <DryingScreen
      facilitiesHref={(farmId) => `/infraestructura?finca=${farmId}`}
      lotHref={lotHref}
    />,
    { queryClient, searchParams, onUrlUpdate },
  );
}

// Cada tarjeta tiene además su propia línea de días, que es otra lista: solo se cuentan las
// tarjetas, los hijos directos de la lista.
const cards = async () =>
  Array.from(
    (
      await screen.findByRole('list', { name: 'Lotes en secado' })
    ).querySelectorAll<HTMLElement>(':scope > li'),
  );

const summaryValue = (title: string) =>
  within(screen.getByRole('region', { name: 'Resumen de secado' }))
    .getByText(title)
    .closest('div');

const startOptions = (responsibleId: string) =>
  HttpResponse.json({
    facilities: [{ id: 'fc1', name: 'M-01', capacity_kg: '600.0' }],
    responsibles: [
      {
        id: responsibleId,
        full_name: 'Quien registra',
        is_active: true,
        assignable: true,
      },
    ],
    entry_moisture_range: { min: '55.0', max: '60.0' },
    earliest_start_at: '2026-10-16T00:00:00-05:00',
  });

describe('DryingScreen', () => {
  it('shows each lot in drying with its dryer, its day and its last humidity', async () => {
    renderScreen();

    const [first, second] = await cards();
    expect(first).toHaveTextContent('000123-F02-P05-261014-1');
    expect(first).toHaveTextContent('F02 · La Esperanza · M-01');
    expect(first).toHaveTextContent('Día 3 de secado · lleva 1 día y 20 h');
    expect(first).toHaveTextContent('12,4 % · día 2 · 23 oct');
    expect(first).toHaveTextContent('Se espera entre el día 5 y el 7');
    expect(first).toHaveTextContent('Falta la bitácora de hoy');
    expect(second).toHaveTextContent('F03 · El Diviso · M-02');
    expect(second).toHaveTextContent('Día 1 de secado · lleva 3 h');
    expect(second).toHaveTextContent('Sin bitácoras todavía');
    expect(
      within(first).getByRole('link', {
        name: 'Ver el lote 000123-F02-P05-261014-1',
      }),
    ).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/lotes\/detalle\?id=l1/),
    );
    expect(
      within(first).getByRole('link', { name: 'Registrar bitácora' }),
    ).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/secado\/bitacora\?lote=l1&origen=/),
    );
  });

  it('draws a dot for every day, naming each one for whoever cannot hover', async () => {
    renderScreen();

    const [first] = await cards();
    const days = within(first).getByRole('list', { name: 'Días del secado' });
    expect(
      within(days).getByLabelText('Día 1 · 22 oct · Sin bitácora'),
    ).toBeInTheDocument();
    expect(
      within(days).getByLabelText('Día 2 · 23 oct · Humedad 12,4 %'),
    ).toBeInTheDocument();
    expect(
      within(days).getByLabelText('Día 3 · hoy · Falta la bitácora'),
    ).toBeInTheDocument();
  });

  it('shows the date and the humidity of a day when hovering its dot', async () => {
    renderScreen();

    const [first] = await cards();
    await userEvent.hover(
      within(first).getByLabelText('Día 2 · 23 oct · Humedad 12,4 %'),
    );

    expect(
      (await screen.findAllByText('Día 2 · 23 oct · Humedad 12,4 %')).length,
    ).toBeGreaterThan(0);
  });

  it('sums up the lots in drying, the logs missing today and the lots ready', async () => {
    renderScreen();

    await cards();
    expect(summaryValue('En secado')).toHaveTextContent('2');
    expect(summaryValue('Bitácora de hoy pendiente')).toHaveTextContent('2');
    await waitFor(() =>
      expect(summaryValue('Listos para secar')).toHaveTextContent('1'),
    );
  });

  it('shows a log saved on the phone as waiting to be sent, and it no longer is missing', async () => {
    await enqueueLog(userId, {
      lotId: 'l1',
      request: {
        id: 'q1',
        measured_at: '2026-10-24T09:00:00-05:00',
        moisture_pct: '10.0',
        sun_hours: '2.0',
        shade_hours: null,
        turn_count: 0,
        turn_frequency_hours: null,
        weather: 'sunny',
        notes: '',
        captured_at: '2026-10-24T14:01:00.000Z',
      },
      label: '000123-F02-P05-261014-1 · bitácora del día 3 · 24 oct',
    });
    renderScreen();

    await waitFor(async () =>
      expect((await cards())[0]).toHaveTextContent(
        '10,0 % · día 3 · 24 oct · Pendiente de enviar',
      ),
    );
    expect((await cards())[0]).toHaveTextContent('Bitácora de hoy al día');
    expect(summaryValue('Bitácora de hoy pendiente')).toHaveTextContent('1');
  });

  it('filters by farm from the URL', async () => {
    renderScreen({ searchParams: '?finca=f2' });

    expect(await cards()).toHaveLength(1);
    expect(summaryValue('En secado')).toHaveTextContent('1');
  });

  it('offers to clear a farm with no lot in drying', async () => {
    server.use(dryingsHandler([dryings[0]]));
    const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
    renderScreen({ searchParams: '?finca=f2', onUrlUpdate });

    expect(
      await screen.findByRole('heading', {
        name: 'Ningún lote en secado en El Diviso.',
      }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Limpiar filtros' }),
    );
    expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe('');
  });

  it('hides the farm filter with a single farm', async () => {
    server.use(farmsHandler([buildFarm({ ...esperanza })]));
    renderScreen();

    await cards();
    expect(
      screen.queryByRole('combobox', { name: 'Finca' }),
    ).not.toBeInTheDocument();
  });

  it('points to the lots ready when none is in drying', async () => {
    server.use(dryingsHandler([]));
    const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
    renderScreen({ onUrlUpdate });

    expect(
      await screen.findByRole('heading', { name: 'No hay lotes en secado.' }),
    ).toBeInTheDocument();
    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Inicia el secado de un lote.',
      }),
    );
    expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe('?vista=listos');
  });

  it('lists the fermented lots ready to dry, with their farm and their weight', async () => {
    const requests: URLSearchParams[] = [];
    server.use(lotsHandler([readyLot], requests));
    renderScreen({ searchParams: '?vista=listos' });

    const list = await screen.findByRole('list', {
      name: 'Lotes listos para secar',
    });
    const [lot] = within(list).getAllByRole('listitem');
    expect(lot).toHaveTextContent('000123-F02-P05-261016-1');
    expect(lot).toHaveTextContent('F02 · La Esperanza');
    expect(lot).toHaveTextContent('186 kg en verde');
    expect(requests[0].get('status')).toBe('fermented');
  });

  it('starts the drying of a ready lot and opens its detail', async () => {
    server.use(
      csrfHandler,
      http.get(apiUrl('/api/drying/start-options'), () => startOptions(userId)),
      http.post(apiUrl('/api/drying'), () =>
        HttpResponse.json(buildDrying(), { status: 201 }),
      ),
    );
    renderScreen({
      searchParams: '?vista=listos',
      permissions: [...MANAGE, PERMISSIONS.FACILITIES_VIEW],
    });

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Iniciar secado de 000123-F02-P05-261016-1',
      }),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Iniciar secado · 000123-F02-P05-261016-1',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('186 kg en verde · F02 · La Esperanza'),
    ).toBeInTheDocument();

    await userEvent.type(
      await screen.findByLabelText('Humedad de entrada (%)'),
      '57,5',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar' }));

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith('/lotes/detalle?id=l9'),
    );
    expect(await screen.findByText('Secado iniciado')).toBeInTheDocument();
  });

  it('opens the start form of the lot a link from Lotes points to, and clears the link', async () => {
    const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
    server.use(
      csrfHandler,
      http.get(apiUrl('/api/drying/start-options'), () => startOptions(userId)),
    );
    renderScreen({ searchParams: '?vista=listos&iniciar=l9', onUrlUpdate });

    expect(
      await screen.findByRole('heading', {
        name: 'Iniciar secado · 000123-F02-P05-261016-1',
      }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(onUrlUpdate.mock.lastCall?.[0].queryString).not.toContain(
        'iniciar',
      ),
    );
  });

  it('warns when the lot of the link is no longer ready to dry', async () => {
    renderScreen({ searchParams: '?vista=listos&iniciar=l-otro' });

    expect(
      await screen.findByText('Este lote ya no está listo para secar.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /Iniciar secado/ }),
    ).not.toBeInTheDocument();
  });

  it('says when no lot is ready to dry', async () => {
    server.use(lotsHandler([]));
    renderScreen({ searchParams: '?vista=listos' });

    expect(
      await screen.findByRole('heading', {
        name: 'No hay lotes listos para secar.',
      }),
    ).toBeInTheDocument();
  });

  it('shows only the lots in drying to whom only records logs', async () => {
    renderScreen({
      searchParams: '?vista=listos',
      permissions: [PERMISSIONS.DRYING_LOG],
    });

    expect(await cards()).toHaveLength(2);
    expect(
      screen.queryByRole('group', { name: 'Vista de secado' }),
    ).not.toBeInTheDocument();
  });

  it('shows the saved copy without a connection, and leaves the lots ready for later', async () => {
    await getOfflineDb(userId).cache.put({
      key: 'drying',
      value: dryings,
      fetchedAt: 1_760_000_000_000,
    });
    server.use(http.get(apiUrl('/api/drying'), () => HttpResponse.error()));
    renderScreen();

    expect(
      await screen.findByText(/Sin conexión: estás viendo la copia del/),
    ).toBeInTheDocument();
    expect(await cards()).toHaveLength(2);

    await userEvent.click(
      screen.getByRole('button', { name: /Listos para secar/ }),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Ver los lotes listos para secar necesita conexión.',
      }),
    ).toBeInTheDocument();
  });

  it('asks for a connection once when there is no copy', async () => {
    server.use(http.get(apiUrl('/api/drying'), () => HttpResponse.error()));
    renderScreen();

    expect(
      await screen.findByRole('heading', {
        name: 'Necesitas conexión una vez para cargar los lotes en secado.',
      }),
    ).toBeInTheDocument();
  });

  it('asks the technical account to choose a producer first', async () => {
    renderScreen({ superuser: true });

    expect(
      await screen.findByText(
        'Elige un productor para ver sus lotes en secado.',
      ),
    ).toBeInTheDocument();
  });
});
