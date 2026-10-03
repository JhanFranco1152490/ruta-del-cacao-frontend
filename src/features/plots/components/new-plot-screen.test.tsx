import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { recordLogin } from '@/lib/offline/session-clock';
import { PERMISSIONS } from '@/lib/permissions';
import { buildPlot, buildSession } from '@/test/factories';
import { apiUrl, plotsHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

vi.mock('@/config/map', async () => {
  const { loadFakePolygonEditor } = await import('@/test/fake-map');
  return { loadPolygonEditorMapProvider: loadFakePolygonEditor };
});

import { NewPlotScreen } from './new-plot-screen';
import type { PlotScreenFarm } from './plot-screen-farm';

const FARM: PlotScreenFarm = {
  id: 'f1',
  name: 'La Esperanza',
  areaHectares: '10.00',
  location: { latitude: '7.8234567', longitude: '-72.5123456' },
  isActive: true,
  detailPath: '/fincas/detalle?id=f1',
  isPendingCreate: false,
};

let userId: string;

beforeEach(async () => {
  userId = `new-plot-${crypto.randomUUID()}`;
  await recordLogin(userId);
});

function renderScreen(farm: PlotScreenFarm = FARM) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: userId,
      permissions: [PERMISSIONS.PLOTS_VIEW, PERMISSIONS.PLOTS_ADD],
    }),
  );
  return {
    user: userEvent.setup(),
    ...renderWithProviders(<NewPlotScreen farm={farm} />, { queryClient }),
  };
}

const fillAndSave = async (
  user: ReturnType<typeof userEvent.setup>,
  code: string,
  area: string,
) => {
  await user.type(await screen.findByLabelText('Código de la parcela'), code);
  await user.type(screen.getByLabelText('Área declarada (hectáreas)'), area);
  await user.click(screen.getByRole('button', { name: 'Guardar parcela' }));
};

describe('NewPlotScreen', () => {
  it('saves the plot on the device under its farm and says how it is going', async () => {
    server.use(plotsHandler([]));
    const { user } = renderScreen();

    await fillAndSave(user, 'P1', '2,4');

    expect(
      await screen.findByRole('heading', {
        name: 'Parcela guardada con éxito',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('P1', { selector: 'strong' })).toBeInTheDocument();
    const [item] = await getOfflineDb(userId).queue.toArray();
    expect(item).toMatchObject({
      resource: 'plots',
      operation: 'create',
      parentId: 'f1',
    });
    expect(item.payload).toMatchObject({
      farm_id: 'f1',
      code: 'P1',
      area_hectares: '2.4',
    });
  });

  it('lets the person register another plot with a fresh form and a new id', async () => {
    server.use(plotsHandler([]));
    const { user } = renderScreen();
    await fillAndSave(user, 'P1', '1');
    await screen.findByRole('heading', { name: 'Parcela guardada con éxito' });

    await user.click(
      screen.getByRole('button', { name: 'Registrar otra parcela' }),
    );
    await fillAndSave(user, 'P2', '1');
    await screen.findByRole('heading', { name: 'Parcela guardada con éxito' });

    const ids = (await getOfflineDb(userId).queue.toArray()).map(
      (item) => item.id,
    );
    expect(new Set(ids).size).toBe(2);
  });

  it('uses the plots already in the farm to check the available area', async () => {
    server.use(plotsHandler([buildPlot({ area_hectares: '8.00' })]));
    const { user } = renderScreen();

    await user.type(
      await screen.findByLabelText('Área declarada (hectáreas)'),
      '3',
    );

    expect(
      screen.getByText(
        'El área ingresada supera el área disponible de la finca',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Disponible en la finca: 2 ha'),
    ).toBeInTheDocument();
  });

  it('takes the plots that wait on the device into account', async () => {
    server.use(plotsHandler([]));
    const first = renderScreen();
    await fillAndSave(first.user, 'P1', '9');
    await screen.findByRole('heading', { name: 'Parcela guardada con éxito' });
    first.unmount();

    const { user } = renderScreen();
    await user.type(await screen.findByLabelText('Código de la parcela'), 'p1');
    await user.type(screen.getByLabelText('Área declarada (hectáreas)'), '2');
    await user.click(screen.getByRole('button', { name: 'Guardar parcela' }));

    expect(
      await screen.findByText(
        'Ya existe una parcela con este código en la finca',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/supera el área disponible/)).toBeInTheDocument();
  });

  it('does not ask the server for the plots of a farm that is only on the device', async () => {
    const requests: URLSearchParams[] = [];
    server.use(plotsHandler([], requests));
    const { user } = renderScreen({ ...FARM, isPendingCreate: true });

    await fillAndSave(user, 'P1', '1');

    await screen.findByRole('heading', { name: 'Parcela guardada con éxito' });
    expect(requests).toHaveLength(0);
  });

  it('cannot save in an inactive farm and says why', async () => {
    server.use(plotsHandler([]));
    renderScreen({ ...FARM, isActive: false });

    expect(
      await screen.findByText(/La finca está inactiva/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Guardar parcela' }),
    ).toBeDisabled();
  });

  it('warns that the server will do the checks when the other plots could not be read', async () => {
    server.use(http.get(apiUrl('/api/plots'), () => HttpResponse.error()));
    renderScreen();

    expect(
      await screen.findByText(/las hará el servidor al sincronizar/),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Guardar parcela' }),
      ).toBeEnabled(),
    );
  });
});
