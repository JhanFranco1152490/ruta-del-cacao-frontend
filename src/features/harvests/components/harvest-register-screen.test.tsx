import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { components } from '@/lib/api/schema';
import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { recordLogin } from '@/lib/offline/session-clock';
import { PERMISSIONS } from '@/lib/permissions';
import { buildCollector, buildPlot, buildSession } from '@/test/factories';
import {
  apiUrl,
  characterizationsHandler,
  harvestCollectorsHandler,
  plotsHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { resetLocation, router } from '@/test/router';
import { server } from '@/test/server';

import {
  enqueueHarvest,
  getQueuedHarvest,
  type HarvestPayload,
  harvestQueueId,
} from '../harvest-queue';
vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { HarvestRegisterScreen } from './harvest-register-screen';

type Planting = components['schemas']['Planting'];

// Jueves 22 de octubre de 2026, a mediodía en Bogotá.
const NOW = new Date('2026-10-22T17:00:00Z');

let userId: string;

const planting = (
  id: string,
  name: string,
  stage: Planting['stage'] = 'full_production',
): Planting => ({
  variety: { id, name, is_active: true },
  planting_date: '2019-02',
  tree_count: 100,
  propagation: 'grafted',
  stage,
});

const characterization = (plotId: string, plantings: Planting[]) => ({
  plot_id: plotId,
  plantings,
  total_trees: 100,
  management_system: null,
  shade_type: null,
  version: 1,
  captured_at: null,
  created_at: '2026-10-01T12:00:00Z',
  updated_at: '2026-10-01T12:00:00Z',
});

const PLOTS = [
  buildPlot({ id: 'pl1', code: 'P05', name: 'Lote del río' }),
  buildPlot({ id: 'pl2', code: 'P06', name: null }),
  buildPlot({ id: 'pl3', code: 'P07', name: 'La loma' }),
];

beforeEach(async () => {
  userId = `harvest-screen-${crypto.randomUUID()}`;
  vi.clearAllMocks();
  resetLocation();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  // Con el reloj de la prueba: la sesión se confirmó hoy, dentro de la ventana sin conexión.
  await recordLogin(userId);
  server.use(
    plotsHandler(PLOTS),
    characterizationsHandler([
      characterization('pl1', [planting('ccn', 'CCN-51')]),
      characterization('pl3', [
        planting('ccn', 'CCN-51'),
        planting('fsa', 'FSA-13', 'establishment'),
      ]),
    ]),
    harvestCollectorsHandler([
      buildCollector({ id: userId, full_name: 'Quien registra' }),
      buildCollector({ id: 'u2', full_name: 'Luis Rincón' }),
    ]),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderScreen(
  props: Partial<Parameters<typeof HarvestRegisterScreen>[0]> = {},
) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: userId,
      permissions: [
        PERMISSIONS.HARVESTS_VIEW,
        PERMISSIONS.HARVESTS_ADD,
        PERMISSIONS.CROPS_CHARACTERIZE,
      ],
    }),
  );
  renderWithProviders(
    <HarvestRegisterScreen
      characterizationHref={(plot) => `/ficha?id=${plot.id}`}
      {...props}
    />,
    { queryClient },
  );
}

const plotField = () =>
  screen.findByRole('combobox', { name: 'Parcela de origen' });
const choosePlot = async (name: RegExp) => {
  await userEvent.click(await plotField());
  await userEvent.click(await screen.findByRole('option', { name }));
};
const field = (name: string) => screen.getByLabelText(name);
const save = async () =>
  userEvent.click(await screen.findByRole('button', { name: /^Guardar/ }));
const queued = async () => getOfflineDb(userId).queue.toArray();

describe('HarvestRegisterScreen', () => {
  it('offers the plots under their farm, and shows the one without plantings without letting it be chosen', async () => {
    renderScreen();

    await userEvent.click(await plotField());

    expect(
      screen.getByRole('option', { name: /P05 · Lote del río/ }),
    ).toHaveTextContent('2,4 ha · CCN-51');
    const blocked = screen.getByRole('option', { name: /P06/ });
    expect(blocked).toHaveTextContent(
      'Sin siembras en su ficha: no se puede cosechar todavía',
    );
    expect(blocked).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('F01 · La Esperanza')).toBeInTheDocument();
  });

  it('records a harvest in the device, with the only variety and the person registering already chosen', async () => {
    renderScreen();

    await choosePlot(/P05 · Lote del río/);
    expect(field('Variedad cosechada')).toHaveValue('ccn');
    await waitFor(() => expect(field('Recolector')).toHaveValue(userId));
    expect(field('Fecha de recolección')).toHaveValue('2026-10-22');
    await userEvent.type(field('Peso en verde (kg)'), '117');
    await save();

    expect(
      await screen.findByRole('heading', { name: 'Cosecha registrada' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('117 kg de CCN-51 · P05 · Lote del río · 22 oct.'),
    ).toBeInTheDocument();
    const [item] = await queued();
    expect(item).toMatchObject({
      resource: 'harvests',
      parentId: 'plot-characterization:pl1',
      payload: {
        label: 'P05 · Lote del río · 22 oct.',
        request: {
          plot_id: 'pl1',
          harvest_date: '2026-10-22',
          green_weight_kg: '117',
          variety_id: 'ccn',
          collector_id: userId,
        },
      },
    });
  });

  it('starts another harvest keeping the plot, the collector and the date', async () => {
    renderScreen();
    await choosePlot(/P05 · Lote del río/);
    await userEvent.selectOptions(field('Recolector'), 'u2');
    await userEvent.clear(field('Fecha de recolección'));
    await userEvent.type(field('Fecha de recolección'), '2026-10-21');
    await userEvent.type(field('Peso en verde (kg)'), '88');
    await save();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Registrar otra cosecha' }),
    );

    expect(await plotField()).toHaveValue('P05 · Lote del río');
    expect(field('Recolector')).toHaveValue('u2');
    expect(field('Fecha de recolección')).toHaveValue('2026-10-21');
    expect(field('Peso en verde (kg)')).toHaveValue('');
  });

  it('says that the harvest stays in the phone without a connection', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderScreen();

    await choosePlot(/P05 · Lote del río/);
    await userEvent.type(field('Peso en verde (kg)'), '117');
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar en el teléfono' }),
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Cosecha guardada en el teléfono',
      }),
    ).toBeInTheDocument();
  });

  it('marks what is missing and a weight that is not above zero', async () => {
    renderScreen();

    await save();
    expect(await screen.findAllByText('Campo obligatorio')).toHaveLength(4);

    await choosePlot(/P05 · Lote del río/);
    await userEvent.type(field('Peso en verde (kg)'), '0');
    await save();
    expect(
      await screen.findByText('El peso debe ser mayor a 0'),
    ).toBeInTheDocument();
    expect(await queued()).toEqual([]);
  });

  it('warns, without stopping, about a variety that is still in establishment', async () => {
    renderScreen();

    await choosePlot(/P07 · La loma/);
    await userEvent.selectOptions(field('Variedad cosechada'), 'fsa');

    expect(
      screen.getByText(/figura en Establecimiento en la ficha de la parcela/),
    ).toBeInTheDocument();
  });

  it('opens with the plot it came from already chosen', async () => {
    renderScreen({ plotId: 'pl1' });

    await waitFor(async () =>
      expect(await plotField()).toHaveValue('P05 · Lote del río'),
    );
    expect(field('Variedad cosechada')).toHaveValue('ccn');
  });

  it('explains, with a way to complete the characterization, a plot without plantings it came from', async () => {
    renderScreen({ plotId: 'pl2' });

    expect(
      await screen.findByText(
        'P06 no tiene siembras en su ficha: no se puede cosechar todavía.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Completar la ficha' }),
    ).toHaveAttribute('href', '/ficha?id=pl2');
    expect(await plotField()).toHaveValue('');
  });

  it('asks for a connection once when the plots were never loaded', async () => {
    server.use(http.get(apiUrl('/api/plots'), () => HttpResponse.error()));
    renderScreen();

    expect(
      await screen.findByText(
        'Necesitas conexión una vez para cargar tus parcelas.',
      ),
    ).toBeInTheDocument();
  });

  describe('correcting what the server rejected', () => {
    const payload: HarvestPayload = {
      request: {
        id: 'h9',
        plot_id: 'pl1',
        harvest_date: '2026-10-20',
        green_weight_kg: '50',
        variety_id: 'ccn',
        collector_id: 'u2',
      },
      label: 'P05 · Lote del río · 20 oct.',
    };

    beforeEach(async () => {
      await enqueueHarvest(userId, payload);
      await getOfflineDb(userId).queue.update(harvestQueueId('h9'), {
        status: 'error',
        errorCode: 'collector_not_available',
        errorMessage: 'El recolector ya no trabaja en esta finca.',
      });
    });

    it('opens with what was captured, keeps the plot and sends it again', async () => {
      renderScreen({ pendingId: 'h9' });

      expect(
        await screen.findByRole('heading', { name: 'Corregir cosecha' }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'No se pudo sincronizar: El recolector ya no trabaja en esta finca.',
        ),
      ).toBeInTheDocument();
      expect(await plotField()).toBeDisabled();
      expect(field('Peso en verde (kg)')).toHaveValue('50');
      await userEvent.selectOptions(field('Recolector'), userId);
      await save();

      await waitFor(() =>
        expect(router.replace).toHaveBeenCalledWith('/cosechas'),
      );
      expect(await getQueuedHarvest(userId, 'h9')).toMatchObject({
        status: 'pending',
        request: { collector_id: userId },
      });
      expect(
        within(document.body).queryByText('Registrar otra cosecha'),
      ).not.toBeInTheDocument();
    });
  });
});
