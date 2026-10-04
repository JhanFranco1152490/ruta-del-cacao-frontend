import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { buildPlot, buildSession } from '@/test/factories';
import { plotsHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { PlotGate } from './plot-gate';

const FARM = {
  id: 'f1',
  detailPath: '/fincas/detalle?id=f1',
  isPendingCreate: false,
};

let userId: string;

beforeEach(() => {
  userId = `plot-gate-${crypto.randomUUID()}`;
});

function renderGate(plotId: string) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions: [PERMISSIONS.PLOTS_VIEW] }),
  );
  renderWithProviders(
    <PlotGate farm={FARM} plotId={plotId}>
      {(plot) => <p>Parcela {plot.code}</p>}
    </PlotGate>,
    { queryClient },
  );
}

describe('PlotGate', () => {
  it('hands over the plot once it is known', async () => {
    server.use(plotsHandler([buildPlot({ id: 'pl1', code: 'P1' })]));
    renderGate('pl1');

    expect(await screen.findByText('Parcela P1')).toBeInTheDocument();
  });

  it('says the plot is not in the farm and links back to it', async () => {
    server.use(plotsHandler([buildPlot({ id: 'pl1', code: 'P1' })]));
    renderGate('pl9');

    expect(
      await screen.findByText('No encontramos esta parcela en la finca.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Volver a la finca' }),
    ).toHaveAttribute('href', '/fincas/detalle?id=f1');
  });
});
