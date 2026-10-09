import { onlineManager } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useRefreshAfterSync } from '@/hooks/use-refresh-after-sync';
import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import {
  clearAdapters,
  processQueue,
  registerAdapter,
} from '@/lib/offline/sync-queue';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildCacaoVariety,
  buildCharacterization,
  buildSession,
} from '@/test/factories';
import {
  apiUrl,
  cacaoVarietiesHandler,
  characterizationsHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import {
  characterizationQueueId,
  enqueueCharacterization,
} from '../characterization-queue';
import { characterizationSyncAdapter } from '../sync-adapter';
import { PlotCharacterizationSummary } from './plot-characterization-summary';

let userId: string;

beforeEach(() => {
  userId = `summary-${crypto.randomUUID()}`;
  server.use(
    cacaoVarietiesHandler([
      buildCacaoVariety({ id: 'v-ccn-51', name: 'CCN-51' }),
      buildCacaoVariety({ id: 'v-fear-5', name: 'FEAR-5' }),
    ]),
  );
});

type Plot = { id: string; code: string; isActive: boolean };

function renderSummaries(
  plots: Plot[],
  {
    permissions = [PERMISSIONS.PLOTS_VIEW, PERMISSIONS.CROPS_CHARACTERIZE],
    farmIsActive = true,
    queryClient = createTestQueryClient(),
    extra = null,
    pagePlotIds,
    withActions,
  }: {
    permissions?: string[];
    farmIsActive?: boolean;
    queryClient?: ReturnType<typeof createTestQueryClient>;
    extra?: ReactNode;
    pagePlotIds?: string[];
    withActions?: boolean;
  } = {},
) {
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions }),
  );
  return renderWithProviders(
    <>
      {extra}
      {plots.map((plot) => (
        <article aria-label={plot.code} key={plot.id}>
          <PlotCharacterizationSummary
            farmId="f1"
            farmIsActive={farmIsActive}
            pagePlotIds={pagePlotIds}
            plot={plot}
            withActions={withActions}
          />
        </article>
      ))}
    </>,
    { queryClient },
  );
}

const P1 = { id: 'pl1', code: 'P1', isActive: true };
const P2 = { id: 'pl2', code: 'P2', isActive: true };

describe('PlotCharacterizationSummary', () => {
  it('summarizes the saved characterization and offers to edit it', async () => {
    server.use(characterizationsHandler([buildCharacterization()]));
    renderSummaries([P1]);

    expect(
      await screen.findByText(
        'CCN-51 y 1 más · 2.400 árboles · Producción estable',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Editar caracterización de P1' }),
    ).toHaveAttribute(
      'href',
      '/fincas/parcelas/caracterizacion?id=pl1&finca=f1',
    );
  });

  it('offers the history of a plot with a saved characterization', async () => {
    server.use(characterizationsHandler([buildCharacterization()]));
    renderSummaries([P1]);

    expect(
      await screen.findByRole('link', { name: 'Ver historial de P1' }),
    ).toHaveAttribute(
      'href',
      '/fincas/parcelas/caracterizacion/historial?id=pl1&finca=f1',
    );
  });

  it('offers no history where there is nothing saved on the server yet', async () => {
    server.use(characterizationsHandler([]));
    await enqueueCharacterization(
      userId,
      'pl1',
      {
        plantings: [
          {
            variety_id: 'v-fear-5',
            planting_date: '2024-01',
            tree_count: 900,
            propagation: 'grafted',
            stage: 'establishment',
          },
        ],
        management_system: null,
        shade_type: null,
      },
      null,
    );
    renderSummaries([P1]);
    await screen.findByText(/Pendiente de sincronizar/);

    expect(
      screen.queryByRole('link', { name: 'Ver historial de P1' }),
    ).not.toBeInTheDocument();
  });

  it('marks a plot without characterization and offers to characterize it', async () => {
    server.use(characterizationsHandler([]));
    renderSummaries([P1]);

    expect(await screen.findByText('Sin caracterizar')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Caracterizar P1' }),
    ).toBeInTheDocument();
  });

  it('does not claim a plot is uncharacterized when its characterizations cannot be read', async () => {
    server.use(
      http.get(apiUrl('/api/plot-characterizations'), () =>
        HttpResponse.error(),
      ),
    );
    renderSummaries([P1]);

    expect(
      await screen.findByText(
        'No pudimos leer la caracterización de esta parcela.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Sin caracterizar')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Abrir caracterización de P1' }),
    ).toBeInTheDocument();
  });

  it('stops loading when the connection drops with the app open', async () => {
    server.use(
      http.get(apiUrl('/api/plot-characterizations'), () =>
        HttpResponse.error(),
      ),
    );
    const queryClient = createTestQueryClient();
    queryClient.setDefaultOptions({
      queries: {
        ...queryClient.getDefaultOptions().queries,
        retry: 1,
        retryDelay: 0,
      },
    });
    onlineManager.setOnline(false);
    try {
      renderSummaries([P1], { queryClient });

      expect(
        await screen.findByText(
          'No pudimos leer la caracterización de esta parcela.',
        ),
      ).toBeInTheDocument();
    } finally {
      onlineManager.setOnline(true);
    }
  });

  describe('when the characterization reaches the server', () => {
    afterEach(() => clearAdapters());

    function RefreshAfterSync() {
      useRefreshAfterSync();
      return null;
    }

    it('asks the server again, as the session frame refreshes, even if the form that saved it is closed', async () => {
      const requests: URLSearchParams[] = [];
      const saved = buildCharacterization({ version: 3 });
      server.use(
        characterizationsHandler([], requests),
        http.put(apiUrl('/api/plot-characterizations/:plotId'), () =>
          HttpResponse.json(saved),
        ),
      );
      registerAdapter(characterizationSyncAdapter);
      await enqueueCharacterization(
        userId,
        'pl1',
        {
          plantings: [
            {
              variety_id: 'v-ccn-51',
              planting_date: '2021-03',
              tree_count: 900,
              propagation: 'grafted',
              stage: 'renovation',
            },
          ],
          management_system: null,
          shade_type: null,
        },
        null,
      );
      renderSummaries([P1], { extra: <RefreshAfterSync /> });
      await screen.findByText(/Pendiente de sincronizar/);
      const before = requests.length;

      await processQueue(userId);

      await waitFor(() => expect(requests.length).toBeGreaterThan(before));
    });
  });

  it('asks the server once for every plot of the farm', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      characterizationsHandler(
        [buildCharacterization({ plot_id: 'pl2' })],
        requests,
      ),
    );
    renderSummaries([P1, P2]);

    expect(
      await within(screen.getByRole('article', { name: 'P2' })).findByText(
        /CCN-51 y 1 más/,
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('article', { name: 'P1' })).getByText(
        'Sin caracterizar',
      ),
    ).toBeInTheDocument();
    expect(requests).toHaveLength(1);
    expect(requests[0].get('farm')).toBe('f1');
  });

  it('shows the characterization still waiting on the device', async () => {
    server.use(characterizationsHandler([]));
    await enqueueCharacterization(
      userId,
      'pl1',
      {
        plantings: [
          {
            variety_id: 'v-fear-5',
            planting_date: '2024-01',
            tree_count: 900,
            propagation: 'grafted',
            stage: 'establishment',
          },
        ],
        management_system: null,
        shade_type: null,
      },
      null,
    );
    renderSummaries([P1]);

    expect(
      await screen.findByText(
        'FEAR-5 · 900 árboles · Establecimiento o formación',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Pendiente de sincronizar en este dispositivo.'),
    ).toBeInTheDocument();
  });

  it('offers to correct or discard a characterization the server rejected', async () => {
    server.use(characterizationsHandler([]));
    await enqueueCharacterization(
      userId,
      'pl1',
      {
        plantings: [
          {
            variety_id: 'v-ccn-51',
            planting_date: '2024-01',
            tree_count: 900,
            propagation: 'grafted',
            stage: 'establishment',
          },
        ],
        management_system: null,
        shade_type: null,
      },
      null,
    );
    await getOfflineDb(userId).queue.update(characterizationQueueId('pl1'), {
      status: 'error',
      errorCode: 'variety_inactive',
      errorMessage: 'La variedad está desactivada.',
    });
    renderSummaries([P1]);

    expect(
      await screen.findByText(
        'No se pudo sincronizar la caracterización: La variedad está desactivada.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Corregir caracterización de P1' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Descartar caracterización' }),
    ).toBeInTheDocument();
  });

  it('only shows the characterization without the permission to characterize', async () => {
    server.use(characterizationsHandler([buildCharacterization()]));
    renderSummaries([P1], { permissions: [PERMISSIONS.PLOTS_VIEW] });

    expect(await screen.findByText(/CCN-51 y 1 más/)).toBeInTheDocument();
    // Editar queda cerrado, pero el historial se sigue pudiendo leer.
    expect(
      screen.queryByRole('link', { name: /caracterización de P1/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ver historial de P1' }),
    ).toBeInTheDocument();
  });

  it('freezes the characterization of an inactive plot or farm', async () => {
    server.use(characterizationsHandler([buildCharacterization()]));
    renderSummaries([{ ...P1, isActive: false }]);

    expect(await screen.findByText(/CCN-51 y 1 más/)).toBeInTheDocument();
    // Editar queda cerrado, pero el historial se sigue pudiendo leer.
    expect(
      screen.queryByRole('link', { name: /caracterización de P1/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ver historial de P1' }),
    ).toBeInTheDocument();
  });

  it('freezes it too when the farm is inactive', async () => {
    server.use(characterizationsHandler([buildCharacterization()]));
    renderSummaries([P1], { farmIsActive: false });

    expect(await screen.findByText(/CCN-51 y 1 más/)).toBeInTheDocument();
    // Editar queda cerrado, pero el historial se sigue pudiendo leer.
    expect(
      screen.queryByRole('link', { name: /caracterización de P1/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ver historial de P1' }),
    ).toBeInTheDocument();
  });

  it('reads the characterizations of a page of plots in a single request', async () => {
    const requests: URLSearchParams[] = [];
    server.use(characterizationsHandler([buildCharacterization()], requests));
    renderSummaries([P1, P2], { pagePlotIds: ['pl2', 'pl1'] });

    expect(
      await within(screen.getByRole('article', { name: 'P1' })).findByText(
        /CCN-51 y 1 más/,
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('article', { name: 'P2' })).getByText(
        'Sin caracterizar',
      ),
    ).toBeInTheDocument();
    expect(requests).toHaveLength(1);
    expect(requests[0].get('plots')).toBe('pl1,pl2');
    expect(requests[0].has('farm')).toBe(false);
  });

  it('only tells the state of the characterization without its actions', async () => {
    server.use(characterizationsHandler([buildCharacterization()]));
    renderSummaries([P1], { withActions: false });

    expect(await screen.findByText(/CCN-51 y 1 más/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
