import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildCacaoVariety,
  buildCharacterization,
  buildSession,
} from '@/test/factories';
import {
  cacaoVarietiesHandler,
  characterizationsHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import {
  characterizationQueueId,
  enqueueCharacterization,
} from '../characterization-queue';
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
  }: { permissions?: string[]; farmIsActive?: boolean } = {},
) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions }),
  );
  return renderWithProviders(
    <>
      {plots.map((plot) => (
        <article aria-label={plot.code} key={plot.id}>
          <PlotCharacterizationSummary
            farmId="f1"
            farmIsActive={farmIsActive}
            plot={plot}
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

  it('marks a plot without characterization and offers to characterize it', async () => {
    server.use(characterizationsHandler([]));
    renderSummaries([P1]);

    expect(await screen.findByText('Sin caracterizar')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Caracterizar P1' }),
    ).toBeInTheDocument();
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
        varieties: [{ variety_id: 'v-fear-5', tree_count: 900 }],
        planting_date: '2024-01',
        stage: 'establishment',
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
        varieties: [{ variety_id: 'v-ccn-51', tree_count: 900 }],
        planting_date: '2024-01',
        stage: 'establishment',
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
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('freezes the characterization of an inactive plot or farm', async () => {
    server.use(characterizationsHandler([buildCharacterization()]));
    renderSummaries([{ ...P1, isActive: false }]);

    expect(await screen.findByText(/CCN-51 y 1 más/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('freezes it too when the farm is inactive', async () => {
    server.use(characterizationsHandler([buildCharacterization()]));
    renderSummaries([P1], { farmIsActive: false });

    expect(await screen.findByText(/CCN-51 y 1 más/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
