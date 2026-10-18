import { cleanup, screen, waitFor } from '@testing-library/react';
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
import { mockLocation, resetLocation, router } from '@/test/router';
import { server } from '@/test/server';

vi.mock('@/config/map', async () => {
  const { loadFakePolygonEditor } = await import('@/test/fake-map');
  return { loadPolygonEditorMapProvider: loadFakePolygonEditor };
});

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { NewPlotScreen } from './new-plot-screen';
import type { PlotScreenFarm } from './plot-screen-farm';

const FARM: PlotScreenFarm = {
  id: 'f1',
  name: 'La Esperanza',
  areaHectares: '10.00',
  location: { latitude: '7.8234567', longitude: '-72.5123456' },
  isActive: true,
  detailPath: '/fincas/detalle?id=f1',
  editPath: '/fincas/editar?id=f1',
  isPendingCreate: false,
};

let userId: string;

beforeEach(async () => {
  userId = `new-plot-${crypto.randomUUID()}`;
  vi.clearAllMocks();
  resetLocation();
  await recordLogin(userId);
});

function renderScreen(
  farm: PlotScreenFarm = FARM,
  // `null`: una cuenta sin productor propio (la asociación o la cuenta técnica).
  producerId: string | null = 'p1',
) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: userId,
      producer_id: producerId,
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
  name: string,
  area: string,
) => {
  const nameField = await screen.findByLabelText(
    'Nombre de la parcela (opcional)',
  );
  await user.clear(nameField);
  await user.type(nameField, name);
  await user.type(screen.getByLabelText('Área declarada (hectáreas)'), area);
  await user.click(screen.getByRole('button', { name: 'Guardar parcela' }));
};

describe('NewPlotScreen', () => {
  it('does not ask for a code: the server gives it, and the name is optional', async () => {
    server.use(plotsHandler([buildPlot({ code: 'P01' })]));
    renderScreen();

    expect(
      await screen.findByLabelText('Nombre de la parcela (opcional)'),
    ).toHaveValue('');
    expect(
      screen.getByText(
        'El código (P01, P02…) lo asigna el sistema al guardar.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Código de la parcela/),
    ).not.toBeInTheDocument();
  });

  it('saves a plot without a name', async () => {
    server.use(plotsHandler([]));
    const { user } = renderScreen();

    await user.type(
      await screen.findByLabelText('Área declarada (hectáreas)'),
      '1',
    );
    await user.click(screen.getByRole('button', { name: 'Guardar parcela' }));

    await screen.findByText('Parcela guardada');
    const [item] = await getOfflineDb(userId).queue.toArray();
    expect(item.payload).toMatchObject({ name: null });
    expect(item.payload).not.toHaveProperty('code');
  });

  it('saves the plot on the device under its farm and goes back to it', async () => {
    server.use(plotsHandler([]));
    const { user } = renderScreen();

    await fillAndSave(user, 'P1', '2,4');

    expect(await screen.findByText('Parcela guardada')).toBeInTheDocument();
    expect(router.replace).toHaveBeenCalledWith('/fincas/detalle?id=f1');
    const [item] = await getOfflineDb(userId).queue.toArray();
    expect(item).toMatchObject({
      resource: 'plots',
      operation: 'create',
      parentId: 'f1',
    });
    expect(item.payload).toMatchObject({
      farm_id: 'f1',
      name: 'P1',
      area_hectares: '2.4',
    });
  });

  it('gives every form its own id, so two plots do not collide', async () => {
    server.use(plotsHandler([]));
    const { user } = renderScreen();
    await fillAndSave(user, 'P1', '1');
    await screen.findByText('Parcela guardada');
    cleanup();

    const another = renderScreen();
    await fillAndSave(another.user, 'P2', '1');
    await waitFor(async () =>
      expect(await getOfflineDb(userId).queue.count()).toBe(2),
    );

    const ids = (await getOfflineDb(userId).queue.toArray()).map(
      (item) => item.id,
    );
    expect(new Set(ids).size).toBe(2);
  });

  it('goes back to the screen it was opened from and carries it to the next plot', async () => {
    mockLocation.search = `origen=${encodeURIComponent('/fincas?buscar=la')}`;
    server.use(plotsHandler([]));
    const { user } = renderScreen();

    await fillAndSave(user, 'P1', '1');

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/fincas?buscar=la'),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Registrar otra parcela' }),
    );
    expect(router.push).toHaveBeenCalledWith(
      `/fincas/parcelas/nueva?finca=f1&origen=${encodeURIComponent('/fincas?buscar=la')}`,
    );
  });

  it('says in the notice that the plot waits on the device without a connection', async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      server.use(plotsHandler([]));
      const { user } = renderScreen();
      await fillAndSave(user, 'P1', '1');

      expect(
        await screen.findByText('Se enviará cuando haya conexión.'),
      ).toBeInTheDocument();
    } finally {
      onLine.mockRestore();
    }
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
    await screen.findByText('Parcela guardada');
    first.unmount();

    const { user } = renderScreen();
    const nameField = await screen.findByLabelText(
      'Nombre de la parcela (opcional)',
    );
    await user.clear(nameField);
    await user.type(nameField, 'p1');
    await user.type(screen.getByLabelText('Área declarada (hectáreas)'), '2');
    await user.click(screen.getByRole('button', { name: 'Guardar parcela' }));

    expect(
      await screen.findByText(
        'Ya existe una parcela con este nombre en la finca',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/supera el área disponible/)).toBeInTheDocument();
  });

  it('does not ask the server for the plots of a farm that is only on the device', async () => {
    const requests: URLSearchParams[] = [];
    server.use(plotsHandler([], requests));
    const { user } = renderScreen({ ...FARM, isPendingCreate: true });

    await fillAndSave(user, 'P1', '1');

    await screen.findByText('Parcela guardada');
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

describe('NewPlotScreen and whose farm it is', () => {
  const OF_ANA = { ...FARM, producerLabel: 'Ana Prueba · PROD-000007' };

  it('says in which farm and of which producer the plot is registered, to an account without a producer', async () => {
    server.use(plotsHandler([]));
    renderScreen(OF_ANA, null);

    expect(
      await screen.findByText(/Registras una parcela en la finca/),
    ).toHaveTextContent(
      'Registras una parcela en la finca La Esperanza, de Ana Prueba · PROD-000007.',
    );
  });

  it('does not say it to the producer itself', async () => {
    server.use(plotsHandler([]));
    renderScreen(OF_ANA);

    await screen.findByLabelText('Nombre de la parcela (opcional)');
    expect(
      screen.queryByText(/Registras una parcela en la finca/),
    ).not.toBeInTheDocument();
  });
});
