import { onlineManager } from '@tanstack/react-query';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { recordLogin } from '@/lib/offline/session-clock';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildFarm,
  buildPage,
  buildPlot,
  buildSession,
  buildVertex,
} from '@/test/factories';
import { apiUrl, farmsHandler, plotsHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

vi.mock('@/config/map', async () => {
  const { loadFakePointsMap } = await import('@/test/fake-map');
  return { loadPointsMapProvider: loadFakePointsMap };
});

import { enqueuePlotCreate } from '../plot-queue';
import type { RenderPlotDetails } from './plot-overview';
import { PlotListScreen } from './plot-list-screen';

const BOUNDARY = [
  buildVertex('-72.5', '7.8'),
  buildVertex('-72.49', '7.8'),
  buildVertex('-72.49', '7.81'),
];
const ALL = [
  PERMISSIONS.PLOTS_VIEW,
  PERMISSIONS.PLOTS_ADD,
  PERMISSIONS.PLOTS_CHANGE,
  PERMISSIONS.PLOTS_DELETE,
] as string[];
const MANGO_FARM = { ...buildPlot().farm, id: 'f2', name: 'El Mango' };
const LUIS_FARM = {
  ...buildPlot().farm,
  id: 'f3',
  name: 'El Porvenir',
  producer: {
    id: 'p2',
    member_code: 'PROD-000002',
    first_name: 'Luis',
    last_name: 'Ejemplo',
  },
};

let userId: string;

beforeEach(async () => {
  userId = `plot-list-${crypto.randomUUID()}`;
  await recordLogin(userId);
  server.use(plotsHandler(), farmsHandler());
});

function renderScreen({
  permissions = ALL,
  searchParams = '',
  // `null`: la cuenta técnica, sin productor propio.
  producerId = 'p1' as string | null,
  renderPlotDetails = undefined as RenderPlotDetails | undefined,
  failedPlotIds = undefined as string[] | undefined,
} = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions, producer_id: producerId }),
  );
  return {
    user: userEvent.setup(),
    ...renderWithProviders(
      <PlotListScreen
        failedPlotIds={failedPlotIds}
        farmHref={(id) => `/fincas/detalle?id=${id}`}
        renderPlotDetails={renderPlotDetails}
      />,
      { queryClient, searchParams },
    ),
  };
}

const groupHeadings = async () =>
  (await screen.findAllByRole('heading', { level: 2 })).map(
    (heading) => heading.textContent,
  );

describe('PlotListScreen', () => {
  it('groups the plots by farm by default, as the server orders them', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      plotsHandler(
        [
          buildPlot({ id: 'pl1', code: 'P1' }),
          buildPlot({ id: 'pl2', code: 'P2' }),
          buildPlot({ id: 'pl3', code: 'P1', farm: MANGO_FARM }),
        ],
        requests,
      ),
    );
    renderScreen();

    expect(
      await screen.findByRole('heading', { name: 'Mis parcelas' }),
    ).toBeInTheDocument();
    expect(await groupHeadings()).toEqual(['La Esperanza', 'El Mango']);
    expect(
      within(
        screen.getByRole('list', { name: 'Parcelas de La Esperanza' }),
      ).getAllByRole('article'),
    ).toHaveLength(2);
    expect(requests.at(-1)?.get('ordering')).toBe('producer,farm,code');
    expect(requests.at(-1)?.get('page_size')).toBe('20');
    // Un productor no ve su propio nombre en cada tarjeta.
    expect(screen.queryByText(/Productor:/)).not.toBeInTheDocument();
  });

  it('lists them flat, by code, when told not to group', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      plotsHandler(
        [
          buildPlot({ id: 'pl1', code: 'P1' }),
          buildPlot({ id: 'pl3', code: 'P2', farm: MANGO_FARM }),
        ],
        requests,
      ),
    );
    renderScreen({ searchParams: '?agrupar=ninguno' });

    expect(
      within(
        await screen.findByRole('list', { name: 'Parcelas' }),
      ).getAllByRole('article'),
    ).toHaveLength(2);
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0);
    expect(requests.at(-1)?.get('ordering')).toBe('code');
  });

  it('offers to register a plot, letting the person choose its farm', async () => {
    renderScreen();

    expect(
      (await screen.findAllByRole('link', { name: 'Registrar parcela' }))[0],
    ).toHaveAttribute('href', '/fincas/parcelas/nueva');
  });

  it('gives each card the same actions as in the farm detail', async () => {
    server.use(plotsHandler([buildPlot({ id: 'a', code: 'P1' })]));
    renderScreen();

    expect(
      await screen.findByRole('link', { name: 'Editar P1' }),
    ).toHaveAttribute('href', '/fincas/parcelas/editar?id=a&finca=f1');
    expect(screen.getByRole('button', { name: 'Desactivar' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeVisible();
  });

  it('offers no changes on the plots of an inactive farm', async () => {
    server.use(
      plotsHandler([
        buildPlot({
          id: 'a',
          code: 'P1',
          farm: { ...buildPlot().farm, is_active: false },
        }),
      ]),
    );
    renderScreen();

    await screen.findByText('P1');
    expect(
      screen.queryByRole('link', { name: 'Editar P1' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Desactivar' }),
    ).not.toBeInTheDocument();
  });

  it('shows first what waits on the device, in its own group with its farm', async () => {
    server.use(
      plotsHandler([buildPlot({ id: 'pl1', code: 'A1' })]),
      farmsHandler([buildFarm({ id: 'f2', name: 'El Mango' })]),
    );
    await enqueuePlotCreate(userId, 'q1', 'f2', {
      code: 'Z-nueva',
      area_hectares: '1.00',
      vertices: [],
    });
    renderScreen({ searchParams: '?agrupar=finca' });

    await waitFor(async () =>
      expect(await groupHeadings()).toEqual([
        'En este dispositivo',
        'La Esperanza',
      ]),
    );
    const pending = within(
      screen.getByRole('list', { name: 'Parcelas de En este dispositivo' }),
    ).getByRole('article');
    expect(within(pending).getByText('Z-nueva')).toBeInTheDocument();
    expect(await within(pending).findByText('El Mango')).toBeInTheDocument();
  });

  it('counts the characterized plots of every page, not just this one', async () => {
    server.use(plotsHandler([buildPlot()], [], { done: 12, pending: 7 }));
    renderScreen();

    expect(
      await screen.findByText('Caracterizadas: 12 de 19 parcelas.'),
    ).toBeInTheDocument();
  });

  it('asks the server for the plots with or without characterization', async () => {
    const requests: URLSearchParams[] = [];
    server.use(plotsHandler([], requests));
    const { user } = renderScreen();

    const filter = await screen.findByRole('combobox', {
      name: 'Caracterización',
    });
    await user.selectOptions(filter, 'sin-caracterizar');
    await waitFor(() =>
      expect(requests.at(-1)?.get('characterization')).toBe('pending'),
    );
    await user.selectOptions(filter, 'caracterizadas');
    await waitFor(() =>
      expect(requests.at(-1)?.get('characterization')).toBe('done'),
    );
  });

  it('shows only what failed on the device, including plots whose characterization failed', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      plotsHandler([buildPlot({ id: 'ok', code: 'Bien' })], requests),
      http.get(apiUrl('/api/plots/ficha-fallida'), () =>
        HttpResponse.json(buildPlot({ id: 'ficha-fallida', code: 'B2' })),
      ),
    );
    await enqueuePlotCreate(userId, 'pendiente', 'f1', {
      code: 'A-pendiente',
      area_hectares: '1.00',
      vertices: [],
    });
    await enqueuePlotCreate(userId, 'fallida', 'f1', {
      code: 'A-fallida',
      area_hectares: '1.00',
      vertices: [],
    });
    await getOfflineDb(userId).queue.update('fallida', {
      status: 'error',
      errorCode: 'plot_overlap',
      errorMessage: 'Se superpone.',
    });
    renderScreen({
      searchParams: '?caracterizacion=con-error',
      failedPlotIds: ['ficha-fallida'],
    });

    expect(await screen.findByText('B2')).toBeInTheDocument();
    expect(screen.getByText('A-fallida')).toBeInTheDocument();
    expect(screen.queryByText('A-pendiente')).not.toBeInTheDocument();
    expect(screen.queryByText('Bien')).not.toBeInTheDocument();
  });

  it('draws the polygons and marks the card of the one touched on the map', async () => {
    server.use(
      plotsHandler([
        buildPlot({ id: 'pl1', code: 'P1', boundary: BOUNDARY }),
        buildPlot({ id: 'pl2', code: 'P2' }),
      ]),
    );
    const { user } = renderScreen();

    expect(
      await screen.findByRole('list', { name: 'Polígonos del mapa' }),
    ).toHaveTextContent('P1 (ok) 3 vértices');
    await user.click(screen.getByRole('button', { name: 'Tocar P1' }));

    const [touched, other] = within(
      screen.getByRole('list', { name: 'Parcelas de La Esperanza' }),
    ).getAllByRole('article');
    expect(touched).toHaveAttribute('data-highlighted', 'true');
    expect(other).not.toHaveAttribute('data-highlighted');
  });

  it('gives each card what another domain adds, with the ids of the page', async () => {
    server.use(
      plotsHandler([
        buildPlot({ id: 'pl1', code: 'P1' }),
        buildPlot({ id: 'pl2', code: 'P2' }),
      ]),
    );
    renderScreen({
      renderPlotDetails: (plot, pagePlotIds) => (
        <p>
          Extra de {plot.code}: {pagePlotIds.join(',')}
        </p>
      ),
    });

    expect(await screen.findByText('Extra de P1: pl1,pl2')).toBeInTheDocument();
  });

  it('says a farm group continues from the previous page', async () => {
    server.use(plotsHandler([buildPlot({ id: 'pl1', code: 'P9' })]));
    renderScreen({ searchParams: '?pagina=2&agrupar=finca' });

    expect(await groupHeadings()).toEqual(['La Esperanza(continúa)']);
  });

  describe('for the technical account', () => {
    it('names the section without "Mis" and nests the farms under their producer', async () => {
      server.use(
        plotsHandler([
          buildPlot({ id: 'pl1' }),
          buildPlot({ id: 'pl2', farm: LUIS_FARM }),
        ]),
      );
      renderScreen({ producerId: null, searchParams: '?agrupar=finca' });

      expect(
        await screen.findByRole('heading', { name: 'Parcelas' }),
      ).toBeInTheDocument();
      expect(await groupHeadings()).toEqual([
        'Ana Prueba · PROD-000007',
        'La Esperanza',
        'Luis Ejemplo · PROD-000002',
        'El Porvenir',
      ]);
      expect(
        screen.getByRole('button', { name: 'Por productor' }),
      ).toBeVisible();
    });

    it('offers the farm filter before choosing a producer, and a farm brings its producer', async () => {
      const requests: URLSearchParams[] = [];
      server.use(
        plotsHandler([], requests),
        farmsHandler([
          buildFarm({
            id: 'f3',
            name: 'El Porvenir',
            producer: LUIS_FARM.producer,
          }),
        ]),
      );
      const { user } = renderScreen({ producerId: null });

      await user.click(
        await screen.findByRole('combobox', { name: 'Filtrar por finca' }),
      );
      await user.click(
        await screen.findByRole('option', { name: /El Porvenir/ }),
      );

      await waitFor(() => {
        expect(requests.at(-1)?.get('farm')).toBe('f3');
        expect(requests.at(-1)?.get('producer')).toBe('p2');
      });
    });
  });

  it('does not group by producer whoever sees only their own', async () => {
    renderScreen();

    await screen.findByRole('heading', { name: 'Mis parcelas' });
    expect(
      screen.queryByRole('button', { name: 'Por productor' }),
    ).not.toBeInTheDocument();
  });

  describe('without connection', () => {
    beforeEach(() => {
      onlineManager.setOnline(false);
      server.use(http.get(apiUrl('/api/plots'), () => HttpResponse.error()));
    });
    afterEach(() => {
      cleanup();
      onlineManager.setOnline(true);
    });

    it('still shows the plots on the device when the server cannot be read', async () => {
      await enqueuePlotCreate(userId, 'q1', 'f1', {
        code: 'P-campo',
        area_hectares: '1.00',
        vertices: [],
      });
      renderScreen();

      expect(
        await screen.findByText(
          /Las guardadas en este dispositivo sí se muestran/,
        ),
      ).toBeInTheDocument();
      expect(await screen.findByText('P-campo')).toBeInTheDocument();
    });

    it('reads the copy saved the last time the list was seen', async () => {
      await getOfflineDb(userId).cache.put({
        key: `plots:list:${JSON.stringify({ ordering: 'producer,farm,code', page: 1 })}`,
        value: {
          ...buildPage([buildPlot({ code: 'P-guardada' })]),
          characterization_counts: { done: 0, pending: 1 },
        },
        fetchedAt: Date.parse('2026-10-05T15:00:00Z'),
      });
      renderScreen();

      expect(await screen.findByText('P-guardada')).toBeInTheDocument();
      expect(screen.getByText(/Parcelas guardadas el/)).toBeInTheDocument();
    });
  });
});
