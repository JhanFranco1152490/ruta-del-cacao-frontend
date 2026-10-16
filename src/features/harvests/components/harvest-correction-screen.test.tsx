import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { recordLogin } from '@/lib/offline/session-clock';
import { PERMISSIONS } from '@/lib/permissions';
import {
  apiError,
  buildCollector,
  buildHarvest,
  buildPlot,
  buildSession,
} from '@/test/factories';
import {
  apiUrl,
  characterizationsHandler,
  harvestCollectorsHandler,
  plotsHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { resetLocation, router } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { HarvestCorrectionScreen } from './harvest-correction-screen';

// Jueves 22 de octubre de 2026, a mediodía en Bogotá.
const NOW = new Date('2026-10-22T17:00:00Z');

const characterization = {
  plot_id: 'pl1',
  plantings: [
    {
      variety: { id: 'v1', name: 'CCN-51', is_active: true },
      planting_date: '2019-02',
      tree_count: 100,
      propagation: 'grafted' as const,
      stage: 'full_production' as const,
    },
  ],
  total_trees: 100,
  management_system: null,
  shade_type: null,
  version: 1,
  captured_at: null,
  created_at: '2026-10-01T12:00:00Z',
  updated_at: '2026-10-01T12:00:00Z',
};

let userId: string;
let patches: unknown[];

beforeEach(async () => {
  userId = `harvest-correction-${crypto.randomUUID()}`;
  patches = [];
  vi.clearAllMocks();
  resetLocation();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  await recordLogin(userId);
  server.use(
    http.get(apiUrl('/api/harvests/h1'), () =>
      HttpResponse.json(buildHarvest()),
    ),
    plotsHandler([buildPlot({ id: 'pl1', code: 'P05', name: 'Lote del río' })]),
    characterizationsHandler([characterization]),
    harvestCollectorsHandler([buildCollector()]),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderScreen() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: userId,
      permissions: [PERMISSIONS.HARVESTS_VIEW, PERMISSIONS.HARVESTS_CHANGE],
    }),
  );
  renderWithProviders(<HarvestCorrectionScreen harvestId="h1" />, {
    queryClient,
  });
}

const weightField = () => screen.findByLabelText('Peso en verde (kg)');
const changeWeight = async (value: string) => {
  const field = await weightField();
  await userEvent.clear(field);
  await userEvent.type(field, value);
  await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
};

describe('HarvestCorrectionScreen', () => {
  it('sends only what changed with the version read and goes back to the detail', async () => {
    server.use(
      http.patch(apiUrl('/api/harvests/h1'), async ({ request }) => {
        patches.push(await request.json());
        return HttpResponse.json(buildHarvest({ green_weight_kg: '118.0' }));
      }),
    );
    renderScreen();

    expect(await weightField()).toHaveValue('120.5');
    await changeWeight('118');

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/cosechas/detalle?id=h1'),
    );
    expect(patches).toEqual([{ green_weight_kg: '118', expected_version: 1 }]);
  });

  it('shows the current version when someone else changed it', async () => {
    server.use(
      http.patch(apiUrl('/api/harvests/h1'), () =>
        HttpResponse.json(
          {
            detail: 'Versión obsoleta.',
            code: 'stale_version',
            fields: {},
            current: buildHarvest({ green_weight_kg: '99.0', version: 2 }),
          },
          { status: 409 },
        ),
      ),
    );
    renderScreen();

    await changeWeight('118');

    expect(
      await screen.findByText(
        'Otra persona cambió esta cosecha. Revisa los datos actuales antes de guardar.',
      ),
    ).toBeInTheDocument();
    expect(await weightField()).toHaveValue('99.0');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('does not correct a harvest that already forms a lot', async () => {
    server.use(
      http.patch(apiUrl('/api/harvests/h1'), () =>
        apiError(409, 'harvest_in_lot'),
      ),
    );
    renderScreen();

    await changeWeight('118');

    expect(
      await screen.findByText(
        'Esta cosecha ya forma un lote: no se puede modificar.',
      ),
    ).toBeInTheDocument();
  });

  it('does not open the form for a harvest in a lot', async () => {
    server.use(
      http.get(apiUrl('/api/harvests/h1'), () =>
        HttpResponse.json(
          buildHarvest({
            lot: {
              id: 'l1',
              code: '000123-F02-P05-261014-1',
              status: 'generated',
            },
          }),
        ),
      ),
    );
    renderScreen();

    expect(
      await screen.findByText(
        'Esta cosecha forma el lote 000123-F02-P05-261014-1: ya no se puede modificar.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Peso en verde (kg)')).toBeNull();
  });

  it('does not correct without a connection', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderScreen();

    expect(
      screen.getByText('Corregir una cosecha necesita conexión.'),
    ).toBeInTheDocument();
  });
});
