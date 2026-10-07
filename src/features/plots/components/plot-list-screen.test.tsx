import { onlineManager } from '@tanstack/react-query';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { recordLogin } from '@/lib/offline/session-clock';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildFarm,
  buildPage,
  buildPlot,
  buildProducer,
  buildSession,
  buildVertex,
} from '@/test/factories';
import { apiUrl, farmsHandler, plotsHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { http, HttpResponse } from 'msw';

vi.mock('@/config/map', async () => {
  const { loadFakePointsMap } = await import('@/test/fake-map');
  return { loadPointsMapProvider: loadFakePointsMap };
});

import { enqueuePlotCreate } from '../plot-queue';
import { PlotListScreen } from './plot-list-screen';

const BOUNDARY = [
  buildVertex('-72.5', '7.8'),
  buildVertex('-72.49', '7.8'),
  buildVertex('-72.49', '7.81'),
];

let userId: string;

beforeEach(async () => {
  userId = `plot-list-${crypto.randomUUID()}`;
  await recordLogin(userId);
  server.use(plotsHandler(), farmsHandler());
});

function renderScreen({
  permissions = [PERMISSIONS.PLOTS_VIEW, PERMISSIONS.PLOTS_ADD] as string[],
  searchParams = '',
  // `null`: la cuenta técnica, sin productor propio.
  producerId = 'p1' as string | null,
  renderPlotDetails = undefined as
    | ((plot: { code: string }, ids: readonly string[]) => React.ReactNode)
    | undefined,
} = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions, producer_id: producerId }),
  );
  return renderWithProviders(
    <PlotListScreen
      farmHref={(id) => `/fincas/detalle?id=${id}`}
      renderPlotDetails={renderPlotDetails}
    />,
    { queryClient, searchParams },
  );
}

const plotCards = async () =>
  within(await screen.findByRole('list', { name: 'Parcelas' })).getAllByRole(
    'article',
  );

describe('PlotListScreen', () => {
  it('lists the plots of every farm of the producer, each with its farm', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      plotsHandler(
        [
          buildPlot({ id: 'pl1', code: 'P1' }),
          buildPlot({
            id: 'pl2',
            code: 'P2',
            farm: { ...buildPlot().farm, id: 'f2', name: 'El Mango' },
          }),
        ],
        requests,
      ),
    );
    renderScreen();

    expect(
      await screen.findByRole('heading', { name: 'Mis parcelas' }),
    ).toBeInTheDocument();
    const [first, second] = await plotCards();
    expect(
      within(first).getByRole('link', { name: 'La Esperanza' }),
    ).toHaveAttribute('href', '/fincas/detalle?id=f1');
    expect(within(second).getByText('El Mango')).toBeInTheDocument();
    // Un productor no ve su propio nombre en cada tarjeta.
    expect(screen.queryByText(/Productor:/)).not.toBeInTheDocument();
    expect(requests.at(-1)?.has('farm')).toBe(false);
    expect(requests.at(-1)?.get('page_size')).toBe('20');
  });

  it('offers to register a plot, letting the person choose its farm', async () => {
    renderScreen();

    expect(
      (await screen.findAllByRole('link', { name: 'Registrar parcela' }))[0],
    ).toHaveAttribute('href', '/fincas/parcelas/nueva');
  });

  it('hides the register action without the add permission', async () => {
    renderScreen({ permissions: [PERMISSIONS.PLOTS_VIEW] });

    await screen.findByText('Aún no tienes parcelas registradas');
    expect(
      screen.queryByRole('link', { name: 'Registrar parcela' }),
    ).not.toBeInTheDocument();
  });

  it('shows first what waits on the device, naming its farm', async () => {
    server.use(
      plotsHandler([buildPlot({ id: 'pl1', code: 'A1' })]),
      farmsHandler([buildFarm({ id: 'f2', name: 'El Mango' })]),
    );
    await enqueuePlotCreate(userId, 'q1', 'f2', {
      code: 'Z-nueva',
      area_hectares: '1.00',
      vertices: [],
    });
    renderScreen();

    await waitFor(async () => expect(await plotCards()).toHaveLength(2));
    const [pending, saved] = await plotCards();
    expect(within(pending).getByText('Z-nueva')).toBeInTheDocument();
    expect(
      within(pending).getByText('Pendiente de sincronización'),
    ).toBeInTheDocument();
    await within(pending).findByText('El Mango');
    expect(within(saved).getByText('A1')).toBeInTheDocument();
  });

  it('filters by one of its farms', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      plotsHandler([], requests),
      farmsHandler([
        buildFarm({ id: 'f1', name: 'La Esperanza' }),
        buildFarm({ id: 'f2', name: 'El Mango' }),
      ]),
    );
    renderScreen();

    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: 'Filtrar por finca' }),
      'f2',
    );

    await waitFor(() => expect(requests.at(-1)?.get('farm')).toBe('f2'));
    expect(
      await screen.findByText('No hay parcelas que coincidan'),
    ).toBeInTheDocument();
  });

  it('draws the polygons and marks the card of the one touched on the map', async () => {
    server.use(
      plotsHandler([
        buildPlot({ id: 'pl1', code: 'P1', boundary: BOUNDARY }),
        buildPlot({ id: 'pl2', code: 'P2' }),
      ]),
    );
    renderScreen();

    expect(
      await screen.findByRole('list', { name: 'Polígonos del mapa' }),
    ).toHaveTextContent('P1 (ok) 3 vértices');
    await userEvent.click(screen.getByRole('button', { name: 'Tocar P1' }));

    const [touched, other] = await plotCards();
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
      renderPlotDetails: (plot, ids) => (
        <p>
          Extra de {plot.code}: {ids.join(',')}
        </p>
      ),
    });

    expect(await screen.findByText('Extra de P1: pl1,pl2')).toBeInTheDocument();
  });

  describe('for the technical account', () => {
    it('names the section without "Mis" and says whose each plot is', async () => {
      server.use(plotsHandler([buildPlot()]));
      renderScreen({ producerId: null });

      expect(
        await screen.findByRole('heading', { name: 'Parcelas' }),
      ).toBeInTheDocument();
      expect(
        await screen.findByText('Ana Prueba · PROD-000007'),
      ).toBeInTheDocument();
      // Sin productor elegido no hay fincas que ofrecer.
      expect(
        screen.queryByRole('combobox', { name: 'Filtrar por finca' }),
      ).not.toBeInTheDocument();
    });

    it('offers the farms of the chosen producer', async () => {
      const plotRequests: URLSearchParams[] = [];
      const farmRequests: URLSearchParams[] = [];
      server.use(
        plotsHandler([], plotRequests),
        farmsHandler(
          [buildFarm({ id: 'f1', name: 'La Esperanza' })],
          farmRequests,
        ),
        http.get(apiUrl('/api/producers/p7'), () =>
          HttpResponse.json(buildProducer({ id: 'p7' })),
        ),
      );
      renderScreen({ producerId: null, searchParams: '?productor=p7' });

      expect(
        await screen.findByRole('combobox', { name: 'Filtrar por finca' }),
      ).toBeInTheDocument();
      expect(farmRequests.at(-1)?.get('producer')).toBe('p7');
      expect(plotRequests.at(-1)?.get('producer')).toBe('p7');
    });
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
      expect(await plotCards()).toHaveLength(1);
      expect(
        screen.queryByRole('status', { name: 'Cargando parcelas' }),
      ).not.toBeInTheDocument();
    });

    it('reads the copy saved the last time the list was seen', async () => {
      await getOfflineDb(userId).cache.put({
        key: `plots:list:${JSON.stringify({ page: 1 })}`,
        value: buildPage([buildPlot({ code: 'P-guardada' })]),
        fetchedAt: Date.parse('2026-10-05T15:00:00Z'),
      });
      renderScreen();

      expect(await screen.findByText('P-guardada')).toBeInTheDocument();
      expect(screen.getByText(/Parcelas guardadas el/)).toBeInTheDocument();
    });
  });
});
