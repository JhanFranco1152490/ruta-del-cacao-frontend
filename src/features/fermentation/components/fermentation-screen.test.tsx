import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { OnUrlUpdateFunction } from 'nuqs/adapters/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildFarm,
  buildFermentation,
  buildFermentationTurn,
  buildHarvest,
  buildLot,
  buildSession,
} from '@/test/factories';
import {
  apiUrl,
  csrfHandler,
  farmsHandler,
  fermentationsHandler,
  lotsHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { resetLocation, router } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { enqueueTurn } from '../turn-queue';
import { FermentationScreen } from './fermentation-screen';

const NOW = new Date('2026-10-17T09:00:00-05:00');

const esperanza = { id: 'f1', code: 'F02', name: 'La Esperanza' };
const diviso = { id: 'f2', code: 'F03', name: 'El Diviso' };

const fermentationOf = (
  lotId: string,
  code: string,
  farm: typeof esperanza,
  overrides: Parameters<typeof buildFermentation>[0] = {},
) =>
  buildFermentation({
    lot: { ...buildFermentation().lot, id: lotId, code },
    farm,
    ...overrides,
  });

// La primera ya pasó la hora de su primer volteo (el 17 a las 07:00); la segunda tiene uno.
const fermentations = [
  fermentationOf('l1', '000123-F02-P05-261014-1', esperanza),
  fermentationOf('l2', '000123-F03-P01-261015-1', diviso, {
    facility: { id: 'fc2', name: 'C-02', capacity_kg: '600.0' },
    started_at: '2026-10-15T09:00:00-05:00',
    turns: [
      buildFermentationTurn({
        turned_at: '2026-10-17T08:30:00-05:00',
        temperature_c: '46.0',
        ph: '4.85',
      }),
    ],
  }),
];

const readyLot = (() => {
  const harvest = buildHarvest();
  return buildLot({
    id: 'l9',
    code: '000123-F02-P05-261016-1',
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
const MANAGE = [
  PERMISSIONS.FERMENTATION_LOG_TURNS,
  PERMISSIONS.FERMENTATION_MANAGE,
];

let userId: string;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  userId = `fermentation-screen-${crypto.randomUUID()}`;
  resetLocation();
  server.use(
    farmsHandler([buildFarm({ ...esperanza }), buildFarm({ ...diviso })]),
    fermentationsHandler(fermentations),
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
    <FermentationScreen
      facilitiesHref={(farmId) => `/infraestructura?finca=${farmId}`}
      lotHref={lotHref}
    />,
    {
      queryClient,
      searchParams,
      onUrlUpdate,
    },
  );
}

// Cada tarjeta tiene además su propia línea de tiempo, que es otra lista: solo se cuentan las
// tarjetas, los hijos directos de la lista.
const cards = async () =>
  Array.from(
    (
      await screen.findByRole('list', { name: 'Lotes en fermentación' })
    ).querySelectorAll<HTMLElement>(':scope > li'),
  );

const summaryValue = (title: string) =>
  within(screen.getByRole('region', { name: 'Resumen de fermentación' }))
    .getByText(title)
    .closest('div');

describe('FermentationScreen', () => {
  it('shows each lot in fermentation with its box, its time and its next turn', async () => {
    renderScreen();

    const [first, second] = await cards();
    expect(first).toHaveTextContent('000123-F02-P05-261014-1');
    expect(first).toHaveTextContent('F02 · La Esperanza · C-01');
    expect(first).toHaveTextContent('50 h de fermentación');
    expect(first).toHaveTextContent('Sin volteos todavía');
    expect(first).toHaveTextContent('Volteo pendiente desde las 07:00');
    expect(second).toHaveTextContent('F03 · El Diviso · C-02');
    expect(second).toHaveTextContent('48 h de fermentación · 1 volteo');
    expect(second).toHaveTextContent('46,0 °C · pH 4,85');
    expect(second).toHaveTextContent('Volteo 1 · 17 oct. 08:30');
    expect(second).toHaveTextContent('Próximo volteo: 18 oct. 08:30');
    expect(
      within(first).getByRole('link', {
        name: 'Ver el lote 000123-F02-P05-261014-1',
      }),
    ).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/lotes\/detalle\?id=l1/),
    );
    expect(
      within(first).getByRole('link', { name: 'Registrar volteo' }),
    ).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/fermentacion\/volteo\?lote=l1&origen=/),
    );
  });

  it('finishes a lot from its card, and says why it cannot yet', async () => {
    renderScreen();

    const [first, second] = await cards();
    expect(
      within(first).getByRole('button', { name: 'Finalizar fermentación' }),
    ).toBeDisabled();
    expect(
      within(first).getByText('Registre al menos un volteo para finalizar'),
    ).toBeInTheDocument();
    await userEvent.click(
      within(second).getByRole('button', { name: 'Finalizar fermentación' }),
    );
    expect(
      await screen.findByRole('dialog', { name: /Finalizar fermentación/ }),
    ).toBeInTheDocument();
  });

  it('does not offer to finish to whom only records turns', async () => {
    renderScreen({ permissions: [PERMISSIONS.FERMENTATION_LOG_TURNS] });

    const [first] = await cards();
    expect(
      within(first).queryByRole('button', { name: 'Finalizar fermentación' }),
    ).not.toBeInTheDocument();
  });

  it('draws the timeline of each lot, naming every point for whoever cannot hover', async () => {
    renderScreen();

    const [, second] = await cards();
    const timeline = within(second).getByRole('list', {
      name: 'Línea de tiempo de la fermentación',
    });
    expect(
      within(timeline).getByLabelText(/^Inicio · 15 oct\. 09:00/),
    ).toBeInTheDocument();
    expect(
      within(timeline).getByLabelText(
        'Volteo 1 · 17 oct. 08:30 · 46,0 °C · pH 4,85',
      ),
    ).toBeInTheDocument();
    expect(
      within(timeline).getByLabelText('Próximo volteo: 18 oct. 08:30'),
    ).toBeInTheDocument();
  });

  it('shows the date of a point of the timeline when hovering it', async () => {
    renderScreen();

    const [, second] = await cards();
    await userEvent.hover(
      within(second).getByLabelText(
        'Volteo 1 · 17 oct. 08:30 · 46,0 °C · pH 4,85',
      ),
    );

    expect(
      (
        await screen.findAllByText(
          'Volteo 1 · 17 oct. 08:30 · 46,0 °C · pH 4,85',
        )
      ).length,
    ).toBeGreaterThan(0);
  });

  it('sums up the lots in fermentation, the overdue turns and the lots ready', async () => {
    renderScreen();

    await cards();
    expect(summaryValue('En fermentación')).toHaveTextContent('2');
    expect(summaryValue('Volteo pendiente')).toHaveTextContent('1');
    await waitFor(() =>
      expect(summaryValue('Listos para fermentar')).toHaveTextContent('1'),
    );
  });

  it('shows a turn saved on the phone as waiting to be sent, and it is no longer overdue', async () => {
    await enqueueTurn(userId, {
      lotId: 'l1',
      request: {
        id: 'q1',
        turned_at: '2026-10-17T08:00:00-05:00',
        temperature_c: '44.5',
        ph: '4.95',
        notes: '',
        captured_at: '2026-10-17T13:01:00.000Z',
      },
      label: '000123-F02-P05-261014-1 · volteo 1 · 17 oct. 08:00',
    });
    renderScreen();

    await waitFor(async () =>
      expect((await cards())[0]).toHaveTextContent(
        'Volteo 1 · 17 oct. 08:00 · Pendiente de enviar',
      ),
    );
    expect((await cards())[0]).toHaveTextContent('44,5 °C · pH 4,95');
    expect((await cards())[0]).toHaveTextContent(
      'Próximo volteo: 18 oct. 08:00',
    );
    expect(summaryValue('Volteo pendiente')).toHaveTextContent('0');
  });

  it('filters by farm from the URL and says when nothing matches', async () => {
    renderScreen({ searchParams: '?finca=f2' });

    expect(await cards()).toHaveLength(1);
    expect(summaryValue('En fermentación')).toHaveTextContent('1');
  });

  it('offers to clear a farm with no lot in fermentation', async () => {
    server.use(fermentationsHandler([fermentations[0]]));
    const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
    renderScreen({ searchParams: '?finca=f2', onUrlUpdate });

    expect(
      await screen.findByRole('heading', {
        name: 'Ningún lote en fermentación en El Diviso.',
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

  it('points to the lots ready when none is in fermentation', async () => {
    server.use(fermentationsHandler([]));
    const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
    renderScreen({ onUrlUpdate });

    expect(
      await screen.findByRole('heading', {
        name: 'No hay lotes en fermentación.',
      }),
    ).toBeInTheDocument();
    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Inicia la fermentación de un lote.',
      }),
    );
    expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe('?vista=listos');
  });

  it('lists the lots ready to ferment, with their farm and their weight', async () => {
    const requests: URLSearchParams[] = [];
    server.use(lotsHandler([readyLot], requests));
    renderScreen({ searchParams: '?vista=listos' });

    const list = await screen.findByRole('list', {
      name: 'Lotes listos para fermentar',
    });
    const [lot] = within(list).getAllByRole('listitem');
    expect(lot).toHaveTextContent('000123-F02-P05-261016-1');
    expect(lot).toHaveTextContent('F02 · La Esperanza');
    expect(lot).toHaveTextContent('186 kg en baba');
    expect(requests[0].get('status')).toBe('generated');
  });

  it('starts the fermentation of a ready lot and opens its detail', async () => {
    server.use(
      csrfHandler,
      http.get(apiUrl('/api/fermentation/start-options'), () =>
        HttpResponse.json({
          facilities: [{ id: 'fc1', name: 'C-01', capacity_kg: '600.0' }],
          responsibles: [
            {
              id: userId,
              full_name: 'Quien registra',
              is_active: true,
              assignable: true,
            },
          ],
          green_weight_kg: '186.0',
          earliest_start_at: '2026-10-16T00:00:00-05:00',
        }),
      ),
      http.post(apiUrl('/api/fermentation'), () =>
        HttpResponse.json(buildFermentation(), { status: 201 }),
      ),
    );
    renderScreen({
      searchParams: '?vista=listos',
      permissions: [...MANAGE, PERMISSIONS.FACILITIES_VIEW],
    });

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Iniciar fermentación de 000123-F02-P05-261016-1',
      }),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Iniciar fermentación · 000123-F02-P05-261016-1',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('186 kg en baba · F02 · La Esperanza'),
    ).toBeInTheDocument();

    await screen.findByLabelText('Fecha y hora de inicio');
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar' }));

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith('/lotes/detalle?id=l9'),
    );
    expect(
      await screen.findByText('Fermentación iniciada'),
    ).toBeInTheDocument();
  });

  it('says when no lot is ready to ferment', async () => {
    server.use(lotsHandler([]));
    renderScreen({ searchParams: '?vista=listos' });

    expect(
      await screen.findByRole('heading', {
        name: 'No hay lotes listos para fermentar.',
      }),
    ).toBeInTheDocument();
  });

  it('shows only the lots in fermentation to whom only records turns', async () => {
    renderScreen({
      searchParams: '?vista=listos',
      permissions: [PERMISSIONS.FERMENTATION_LOG_TURNS],
    });

    expect(await cards()).toHaveLength(2);
    expect(
      screen.queryByRole('group', { name: 'Vista de fermentación' }),
    ).not.toBeInTheDocument();
  });

  it('shows the saved copy without a connection, and leaves the lots ready for later', async () => {
    await getOfflineDb(userId).cache.put({
      key: 'fermentation',
      value: fermentations,
      fetchedAt: 1_760_000_000_000,
    });
    server.use(
      http.get(apiUrl('/api/fermentation'), () => HttpResponse.error()),
    );
    renderScreen();

    expect(
      await screen.findByText(/Sin conexión: estás viendo la copia del/),
    ).toBeInTheDocument();
    expect(await cards()).toHaveLength(2);

    await userEvent.click(
      screen.getByRole('button', { name: /Listos para fermentar/ }),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Ver los lotes listos para fermentar necesita conexión.',
      }),
    ).toBeInTheDocument();
  });

  it('asks for a connection once when there is no copy', async () => {
    server.use(
      http.get(apiUrl('/api/fermentation'), () => HttpResponse.error()),
    );
    renderScreen();

    expect(
      await screen.findByRole('heading', {
        name: 'Necesitas conexión una vez para cargar los lotes en fermentación.',
      }),
    ).toBeInTheDocument();
  });

  it('asks the technical account to choose a producer first', async () => {
    renderScreen({ superuser: true });

    expect(
      await screen.findByText(
        'Elige un productor para ver sus lotes en fermentación.',
      ),
    ).toBeInTheDocument();
  });
});
