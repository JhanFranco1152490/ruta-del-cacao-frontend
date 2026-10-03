import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { recordLogin } from '@/lib/offline/session-clock';
import { PERMISSIONS } from '@/lib/permissions';
import { buildPlot, buildSession, buildVertex } from '@/test/factories';
import { apiUrl, plotsHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { router } from '@/test/router';
import { server } from '@/test/server';

vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/config/map', async () => {
  const { loadFakePolygonEditor } = await import('@/test/fake-map');
  return { loadPolygonEditorMapProvider: loadFakePolygonEditor };
});

import { EditPlotScreen } from './edit-plot-screen';
import { enqueuePlotCreate, getQueuedPlot } from '../plot-queue';
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
  userId = `edit-plot-${crypto.randomUUID()}`;
  await recordLogin(userId);
  router.push.mockClear();
});

function renderScreen(plotId: string, farm: PlotScreenFarm = FARM) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: userId,
      permissions: [
        PERMISSIONS.PLOTS_VIEW,
        PERMISSIONS.PLOTS_ADD,
        PERMISSIONS.PLOTS_CHANGE,
      ],
    }),
  );
  return {
    user: userEvent.setup(),
    ...renderWithProviders(<EditPlotScreen farm={farm} plotId={plotId} />, {
      queryClient,
    }),
  };
}

describe('EditPlotScreen — a plot of the server', () => {
  it('starts from the plot and queues the edit with the version that was read', async () => {
    server.use(
      plotsHandler([
        buildPlot({ id: 'pl1', code: 'P1', area_hectares: '2.00', version: 4 }),
      ]),
    );
    const { user } = renderScreen('pl1');

    const code = await screen.findByLabelText('Código de la parcela');
    expect(code).toHaveValue('P1');
    await user.clear(code);
    await user.type(code, 'P1 renombrada');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await vi.waitFor(() =>
      expect(router.push).toHaveBeenCalledWith('/fincas/detalle?id=f1'),
    );
    const queued = await getQueuedPlot(userId, 'pl1');
    expect(queued).toMatchObject({
      operation: 'update',
      expectedVersion: 4,
      farmId: 'f1',
    });
    expect(queued?.values.code).toBe('P1 renombrada');
  });

  it('does not count the plot against its own area or its own code', async () => {
    server.use(
      plotsHandler([
        buildPlot({ id: 'pl1', code: 'P1', area_hectares: '10.00' }),
      ]),
    );
    const { user } = renderScreen('pl1');

    await screen.findByLabelText('Código de la parcela');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await vi.waitFor(() => expect(router.push).toHaveBeenCalled());
    expect(
      screen.queryByText(/supera el área disponible/),
    ).not.toBeInTheDocument();
  });

  it('says so when the plot is not in the farm', async () => {
    server.use(plotsHandler([]));
    renderScreen('nope');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No encontramos esta parcela en la finca.',
    );
    expect(
      screen.getByRole('link', { name: 'Volver a la finca' }),
    ).toHaveAttribute('href', '/fincas/detalle?id=f1');
  });

  it('asks for a connection when the plot was never opened before', async () => {
    server.use(http.get(apiUrl('/api/plots'), () => HttpResponse.error()));
    renderScreen('pl1');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'necesitas conexión para editarla',
    );
  });
});

describe('EditPlotScreen — a plot waiting on the device', () => {
  it('corrects a plot the server rejected and sends it again', async () => {
    server.use(plotsHandler([]));
    await enqueuePlotCreate(userId, 'pl9', 'f1', {
      code: 'P9',
      area_hectares: '3.00',
      vertices: [],
    });
    await getOfflineDb(userId).queue.update('pl9', {
      status: 'error',
      errorCode: 'plot_area_exceeds_farm',
      errorMessage: 'El área ingresada supera el área disponible de la finca.',
    });
    const { user } = renderScreen('pl9');

    expect(
      await screen.findByRole('heading', { name: 'Corregir parcela' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'supera el área disponible',
    );
    const area = screen.getByLabelText('Área declarada (hectáreas)');
    await user.clear(area);
    await user.type(area, '1');
    await user.click(
      screen.getByRole('button', { name: 'Guardar y reenviar' }),
    );

    await vi.waitFor(() =>
      expect(router.push).toHaveBeenCalledWith('/fincas/detalle?id=f1'),
    );
    const fixed = await getQueuedPlot(userId, 'pl9');
    expect(fixed).toMatchObject({ status: 'pending' });
    expect(fixed?.values.area_hectares).toBe('1');
    expect(fixed?.errorMessage).toBeUndefined();
  });

  it('edits a plot that has not reached the server yet', async () => {
    server.use(plotsHandler([]));
    await enqueuePlotCreate(userId, 'pl9', 'f1', {
      code: 'P9',
      area_hectares: '3.00',
      vertices: [],
    });
    renderScreen('pl9');

    expect(
      await screen.findByRole('heading', { name: 'Editar parcela' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Código de la parcela')).toHaveValue('P9');
  });
});

describe('EditPlotScreen — correcting what the server sent back', () => {
  const failWith = async (
    code: string,
    message: string,
    errorData: unknown,
  ) => {
    await enqueuePlotCreate(userId, 'pl9', 'f1', {
      code: 'P9',
      area_hectares: '3.00',
      vertices: [],
    });
    await getOfflineDb(userId).queue.update('pl9', {
      status: 'error',
      errorCode: code,
      errorMessage: message,
      errorData,
    });
  };

  it('resends an edit with the current version of the server plot after showing it', async () => {
    server.use(plotsHandler([]));
    await getOfflineDb(userId).queue.add({
      id: 'pl1',
      resource: 'plots',
      operation: 'update',
      parentId: 'f1',
      payload: {
        code: 'Mi código',
        area_hectares: '1.00',
        boundary: null,
        expected_version: 1,
      },
      status: 'error',
      errorCode: 'stale_version',
      errorMessage: 'La parcela cambió.',
      errorData: {
        current: buildPlot({ id: 'pl1', code: 'Código ajeno', version: 5 }),
      },
      createdAt: 1,
      updatedAt: 1,
    });
    const { user } = renderScreen('pl1');

    expect(
      await screen.findByText(/ahora es «Código ajeno»/),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Guardar y reenviar' }),
    );

    await vi.waitFor(() => expect(router.push).toHaveBeenCalled());
    expect((await getQueuedPlot(userId, 'pl1'))?.expectedVersion).toBe(5);
  });

  it('draws the plot the server said was invaded even when the device did not know it', async () => {
    server.use(plotsHandler([]));
    await failWith('plot_overlap', 'Se superpone con la parcela P2.', {
      overlaps: [
        {
          plot_id: 'p2',
          code: 'P2',
          overlap_area_hectares: '0.1200',
          boundary: [
            buildVertex('-72.5', '7.8'),
            buildVertex('-72.499', '7.8'),
            buildVertex('-72.499', '7.801'),
          ],
        },
      ],
    });
    renderScreen('pl9');

    expect(await screen.findByText('Vecinas: P2')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Se superpone con la parcela P2.',
    );
  });

  it('explains a mismatch of areas with the calculated one to use', async () => {
    server.use(plotsHandler([]));
    await enqueuePlotCreate(userId, 'pl8', 'f1', {
      code: 'P8',
      area_hectares: '9.00',
      vertices: [
        {
          latitude: 7.8,
          longitude: -72.5,
          source: 'map',
          accuracyM: null,
          capturedAt: null,
        },
        {
          latitude: 7.801,
          longitude: -72.499,
          source: 'map',
          accuracyM: null,
          capturedAt: null,
        },
        {
          latitude: 7.802,
          longitude: -72.5,
          source: 'map',
          accuracyM: null,
          capturedAt: null,
        },
      ],
    });
    await getOfflineDb(userId).queue.update('pl8', {
      status: 'error',
      errorCode: 'area_mismatch',
      errorMessage: 'El área declarada difiere más del 5 % del área dibujada.',
      errorData: { measured_area_hectares: '1.2300' },
    });
    renderScreen('pl8');

    expect(
      await screen.findByRole('button', { name: 'Usar área calculada' }),
    ).toBeInTheDocument();
  });

  it('offers only to discard a plot whose farm or plot no longer exists', async () => {
    server.use(plotsHandler([]));
    await failWith(
      'plot_deleted',
      'Esta parcela o su finca fue eliminada. Descarta este registro.',
      undefined,
    );
    renderScreen('pl9');

    expect(await screen.findByRole('alert')).toHaveTextContent('fue eliminada');
  });
});
