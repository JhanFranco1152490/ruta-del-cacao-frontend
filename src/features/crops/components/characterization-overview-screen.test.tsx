import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
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

import { enqueueCharacterization } from '../characterization-queue';
import { CharacterizationOverviewScreen } from './characterization-overview-screen';

let userId: string;

beforeEach(() => {
  userId = `overview-${crypto.randomUUID()}`;
  server.use(
    cacaoVarietiesHandler([
      buildCacaoVariety({ id: 'v-ccn-51', name: 'CCN-51' }),
    ]),
  );
});

const farm = { id: 'f1', isActive: true };
const PLOTS = [
  { id: 'pl1', code: 'P1', isActive: true, farm },
  { id: 'pl2', code: 'P2', isActive: true, farm },
  { id: 'pl3', code: 'P3', isActive: true, farm },
];

// Hace las veces de la lista de parcelas, que es de otro dominio y entrega la página.
function renderScreen() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: userId,
      permissions: [PERMISSIONS.PLOTS_VIEW, PERMISSIONS.CROPS_CHARACTERIZE],
    }),
  );
  const ids = PLOTS.map((plot) => plot.id);
  return renderWithProviders(
    <CharacterizationOverviewScreen
      renderPlots={({ renderPlotDetails, renderSummary }) => (
        <>
          {renderSummary(ids)}
          {PLOTS.map((plot) => (
            <article aria-label={plot.code} key={plot.id}>
              {renderPlotDetails(plot, ids)}
            </article>
          ))}
        </>
      )}
    />,
    { queryClient },
  );
}

describe('CharacterizationOverviewScreen', () => {
  it('says how many plots of the page are characterized, counting the ones on the device', async () => {
    server.use(characterizationsHandler([buildCharacterization()]));
    await enqueueCharacterization(
      userId,
      'pl2',
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
    renderScreen();

    expect(
      screen.getByRole('heading', { name: 'Caracterización' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        'Caracterizadas: 2 de 3 parcelas de esta página.',
      ),
    ).toBeInTheDocument();
  });

  it('offers to characterize each plot that has no characterization yet', async () => {
    server.use(characterizationsHandler([buildCharacterization()]));
    renderScreen();

    const pending = screen.getByRole('article', { name: 'P3' });
    expect(
      await within(pending).findByRole('link', { name: 'Caracterizar P3' }),
    ).toHaveAttribute(
      'href',
      '/fincas/parcelas/caracterizacion?id=pl3&finca=f1',
    );
    expect(
      await within(screen.getByRole('article', { name: 'P1' })).findByRole(
        'link',
        { name: 'Editar caracterización de P1' },
      ),
    ).toBeInTheDocument();
  });
});
