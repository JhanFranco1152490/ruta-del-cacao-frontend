import { onlineManager } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { recordLogin } from '@/lib/offline/session-clock';
import { PERMISSIONS } from '@/lib/permissions';
import {
  apiError,
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
import {
  CharacterizationScreen,
  type CharacterizationPlot,
  NO_CATALOG_MESSAGE,
} from './characterization-screen';

type User = ReturnType<typeof userEvent.setup>;

const FARM = {
  id: 'f1',
  name: 'La Esperanza',
  detailPath: '/fincas/detalle?id=f1',
  isActive: true,
};
const PLOT: CharacterizationPlot = {
  id: 'pl1',
  code: 'P1',
  areaHectares: '2.40',
  isActive: true,
};

let userId: string;

beforeEach(async () => {
  userId = `characterization-screen-${crypto.randomUUID()}`;
  await recordLogin(userId);
  server.use(
    cacaoVarietiesHandler([
      buildCacaoVariety({ id: 'v-ccn-51', name: 'CCN-51' }),
      buildCacaoVariety({ id: 'v-ics-95', name: 'ICS-95' }),
    ]),
    // El envío falla de forma pasajera: la ficha queda en la cola para revisarla.
    http.put(apiUrl('/api/plot-characterizations/:plotId'), () =>
      apiError(503, 'server_error'),
    ),
  );
});

function renderScreen(
  plot: CharacterizationPlot = PLOT,
  farm = FARM,
  queryClient = createTestQueryClient(),
) {
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: userId,
      permissions: [PERMISSIONS.PLOTS_VIEW, PERMISSIONS.CROPS_CHARACTERIZE],
    }),
  );
  renderWithProviders(<CharacterizationScreen farm={farm} plot={plot} />, {
    queryClient,
  });
  return userEvent.setup();
}

async function fillNewCharacterization(user: User) {
  await user.selectOptions(
    await screen.findByLabelText('Variedad 1'),
    'v-ccn-51',
  );
  await user.click(screen.getByLabelText('Número de árboles'));
  await user.paste('2000');
  await user.selectOptions(screen.getByLabelText('Mes de siembra'), '03');
  await user.selectOptions(screen.getByLabelText('Año de siembra'), '2021');
  await user.selectOptions(
    screen.getByLabelText('Etapa del ciclo productivo'),
    'full_production',
  );
}

const save = (user: User, name = 'Guardar caracterización') =>
  user.click(screen.getByRole('button', { name }));

const queuedPayload = async () =>
  (await getOfflineDb(userId).queue.get(characterizationQueueId('pl1')))
    ?.payload as Record<string, unknown> | undefined;

describe('CharacterizationScreen', () => {
  it('saves a new characterization on the device as one the plot did not have', async () => {
    server.use(characterizationsHandler([]));
    const user = renderScreen();

    expect(
      await screen.findByText(/Área declarada de la parcela: 2,4 ha/),
    ).toBeInTheDocument();
    await fillNewCharacterization(user);
    await save(user);

    expect(
      await screen.findByRole('heading', {
        name: 'Caracterización guardada exitosamente',
      }),
    ).toHaveFocus();
    expect(await queuedPayload()).toMatchObject({
      varieties: [{ variety_id: 'v-ccn-51', tree_count: 2000 }],
      planting_date: '2021-03',
      stage: 'full_production',
      expected_version: null,
    });
  });

  it('starts from the saved characterization and sends the version it read', async () => {
    server.use(characterizationsHandler([buildCharacterization()]));
    const user = renderScreen();

    expect(await screen.findByLabelText('Variedad 1')).toHaveValue('v-ccn-51');
    expect(screen.getByLabelText('Variedad 2')).toHaveValue('v-ics-95');
    await user.selectOptions(
      screen.getByLabelText('Etapa del ciclo productivo'),
      'renovation',
    );
    await save(user);

    await screen.findByRole('heading', {
      name: 'Caracterización guardada exitosamente',
    });
    expect(await queuedPayload()).toMatchObject({
      stage: 'renovation',
      expected_version: 2,
    });
  });

  it('cannot save without the variety catalog saved on the device', async () => {
    server.use(
      characterizationsHandler([]),
      http.get(apiUrl('/api/cacao-varieties'), () => HttpResponse.error()),
    );
    renderScreen();

    expect(await screen.findByText(NO_CATALOG_MESSAGE)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Guardar caracterización' }),
    ).toBeDisabled();
  });

  it('shows the server version of a stale characterization and resends with it', async () => {
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
      errorCode: 'stale_version',
      errorMessage: 'La caracterización fue modificada.',
      errorData: { current: buildCharacterization({ version: 5 }) },
    });
    const user = renderScreen();

    expect(
      await screen.findByText(
        /En el servidor la ficha ahora dice: CCN-51 y 1 más · 2.400 árboles · Producción estable/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Variedad 1')).toHaveValue('v-ccn-51');
    await save(user, 'Guardar y reenviar');

    await screen.findByRole('heading', {
      name: 'Caracterización guardada exitosamente',
    });
    await waitFor(async () =>
      expect(await queuedPayload()).toMatchObject({
        expected_version: 5,
        stage: 'establishment',
      }),
    );
  });

  it('lets keep a deactivated variety its saved characterization already had', async () => {
    server.use(
      characterizationsHandler([
        buildCharacterization({
          varieties: [
            {
              variety: { id: 'v-scc-61', name: 'SCC-61', is_active: false },
              tree_count: 900,
            },
          ],
        }),
      ]),
    );
    renderScreen();

    expect(
      await screen.findByLabelText('Variedad 1'),
    ).toHaveAccessibleDescription(
      'Variedad desactivada: ya no se ofrece para fichas nuevas. Puedes conservarla o cambiarla.',
    );
  });

  it('asks to change a deactivated variety the server rejected for a new line', async () => {
    server.use(characterizationsHandler([]));
    await enqueueCharacterization(
      userId,
      'pl1',
      {
        varieties: [{ variety_id: 'v-scc-61', tree_count: 900 }],
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
      errorMessage: 'Variedad desactivada: SCC-61. Elige otra del catálogo.',
    });
    renderScreen();

    expect(
      await screen.findByLabelText('Variedad 1'),
    ).toHaveAccessibleDescription(
      'Esta variedad ya no está disponible. Elige otra del catálogo.',
    );
  });

  it('does not let an inactive plot change its characterization', async () => {
    server.use(characterizationsHandler([buildCharacterization()]));
    renderScreen({ ...PLOT, isActive: false });

    expect(
      await screen.findByText(
        'La parcela está inactiva: su caracterización no se puede editar. Reactívala para continuar.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Guardar caracterización' }),
    ).toBeDisabled();
  });

  it('links back to its farm', async () => {
    server.use(characterizationsHandler([]));
    renderScreen();

    expect(
      await screen.findByRole('link', { name: 'La Esperanza' }),
    ).toHaveAttribute('href', '/fincas/detalle?id=f1');
    expect(screen.getByRole('link', { name: 'Cancelar' })).toHaveAttribute(
      'href',
      '/fincas/detalle?id=f1',
    );
  });
});

// La conexión se cae con la app abierta: TanStack Query sabe que no hay red y deja en pausa el
// reintento de una lectura que falló, en vez de terminarla con error.
describe('CharacterizationScreen when the connection drops with the app open', () => {
  function offlineQueryClient() {
    const queryClient = createTestQueryClient();
    queryClient.setDefaultOptions({
      queries: {
        ...queryClient.getDefaultOptions().queries,
        retry: 1,
        retryDelay: 0,
      },
    });
    return queryClient;
  }

  beforeEach(() => onlineManager.setOnline(false));
  afterEach(() => onlineManager.setOnline(true));

  it('says it needs the variety catalog once instead of loading forever', async () => {
    server.use(
      characterizationsHandler([]),
      http.get(apiUrl('/api/cacao-varieties'), () => HttpResponse.error()),
    );
    renderScreen(PLOT, FARM, offlineQueryClient());

    expect(await screen.findByText(NO_CATALOG_MESSAGE)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Guardar caracterización' }),
    ).toBeDisabled();
  });

  it('lets characterize when the saved characterizations cannot be read', async () => {
    server.use(
      http.get(apiUrl('/api/plot-characterizations'), () =>
        HttpResponse.error(),
      ),
    );
    renderScreen(PLOT, FARM, offlineQueryClient());

    expect(
      await screen.findByText(
        /No pudimos leer la caracterización guardada de esta parcela/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Guardar caracterización' }),
    ).toBeEnabled();
  });
});
