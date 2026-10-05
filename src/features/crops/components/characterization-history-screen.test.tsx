import { onlineManager } from '@tanstack/react-query';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import {
  apiError,
  buildCharacterizationEvent,
  buildSnapshotPlanting,
} from '@/test/factories';
import { apiUrl, characterizationHistoryHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { CharacterizationHistoryScreen } from './characterization-history-screen';

const FARM = {
  id: 'f1',
  name: 'La Esperanza',
  detailPath: '/fincas/detalle?id=f1',
};
const PLOT = { id: 'pl1', code: 'P1' };

afterEach(() => onlineManager.setOnline(true));

const planting = (stage: 'establishment' | 'full_production' | 'renovation') =>
  buildSnapshotPlanting({ stage });

const snapshotOf = (
  stage: 'establishment' | 'full_production' | 'renovation',
) => ({
  plantings: [planting(stage)],
  management_system: null,
  shade_type: null,
});

// Tres versiones: registrada en formación, pasó a producción y luego a renovación.
const threeVersions = [
  buildCharacterizationEvent({
    version: 3,
    action: 'updated',
    occurred_at: '2026-10-03T16:20:00-05:00',
    changed_fields: ['plantings'],
    snapshot: snapshotOf('renovation'),
  }),
  buildCharacterizationEvent({
    version: 2,
    action: 'updated',
    occurred_at: '2026-10-02T09:00:00-05:00',
    changed_fields: ['plantings'],
    snapshot: snapshotOf('full_production'),
  }),
  buildCharacterizationEvent({
    version: 1,
    action: 'created',
    occurred_at: '2026-10-01T10:30:00-05:00',
    snapshot: snapshotOf('establishment'),
  }),
];

const render = (queryClient = createTestQueryClient()) => {
  renderWithProviders(
    <CharacterizationHistoryScreen farm={FARM} plot={PLOT} />,
    {
      queryClient,
    },
  );
  return userEvent.setup();
};

const versionItem = (version: number) =>
  screen.getByRole('heading', { name: `Versión ${version}` }).closest('li')!;

describe('CharacterizationHistoryScreen', () => {
  it('lists the versions from the newest to the oldest', async () => {
    server.use(characterizationHistoryHandler(threeVersions));
    render();

    const headings = await screen.findAllByRole('heading', {
      name: /^Versión/,
    });

    expect(headings.map((heading) => heading.textContent)).toEqual([
      'Versión 3',
      'Versión 2',
      'Versión 1',
    ]);
  });

  it('says when each version was saved, by whom, and what it was', async () => {
    server.use(characterizationHistoryHandler(threeVersions));
    render();
    await screen.findByRole('heading', { name: 'Versión 3' });

    const item = versionItem(3);
    expect(
      within(item).getByText(/3 de octubre de 2026, 4:20 p\.m\./),
    ).toBeInTheDocument();
    expect(
      within(item).getByText(/Guardada por Ana Gómez/),
    ).toBeInTheDocument();
    expect(within(item).getByText('Actualizada')).toBeInTheDocument();
    expect(within(versionItem(1)).getByText('Registrada')).toBeInTheDocument();
  });

  it('shows the moment a planting went from one stage to another', async () => {
    server.use(characterizationHistoryHandler(threeVersions));
    render();
    await screen.findByRole('heading', { name: 'Versión 3' });

    expect(
      within(versionItem(3)).getByText(
        'Etapa de CCN-51 (marzo de 2021): Producción estable → Renovación o rehabilitación',
      ),
    ).toBeInTheDocument();
    expect(
      within(versionItem(2)).getByText(
        'Etapa de CCN-51 (marzo de 2021): Establecimiento o formación → Producción estable',
      ),
    ).toBeInTheDocument();
  });

  it('shows what the first version registered, since there is nothing to compare it with', async () => {
    server.use(characterizationHistoryHandler(threeVersions));
    render();
    await screen.findByRole('heading', { name: 'Versión 1' });

    expect(
      within(versionItem(1)).getByText(
        'CCN-51 (marzo de 2021): 1.800 árboles · Injerto o clon · Establecimiento o formación',
      ),
    ).toBeInTheDocument();
  });

  it('says so when the account that saved a version no longer exists', async () => {
    server.use(
      characterizationHistoryHandler([
        buildCharacterizationEvent({ actor_name: null }),
      ]),
    );
    render();

    expect(
      await screen.findByText(/Guardada por Cuenta eliminada/),
    ).toBeInTheDocument();
  });

  it('says the values did not change when two versions hold the same', async () => {
    server.use(
      characterizationHistoryHandler([
        buildCharacterizationEvent({ version: 2, action: 'updated' }),
        buildCharacterizationEvent({ version: 1 }),
      ]),
    );
    render();
    await screen.findByRole('heading', { name: 'Versión 2' });

    expect(
      within(versionItem(2)).getByText('Los valores no cambiaron.'),
    ).toBeInTheDocument();
  });

  it('loads more versions, and compares the last one shown once its predecessor arrives', async () => {
    // 25 versiones: la primera página trae de la 25 a la 6.
    const many = Array.from({ length: 25 }, (_, index) =>
      buildCharacterizationEvent({
        version: 25 - index,
        action: index === 24 ? 'created' : 'updated',
        snapshot: {
          plantings: [
            buildSnapshotPlanting({ tree_count: 1000 + (25 - index) }),
          ],
          management_system: null,
          shade_type: null,
        },
      }),
    );
    server.use(characterizationHistoryHandler(many));
    const user = render();
    await screen.findByRole('heading', { name: 'Versión 25' });

    // Sin la 5 cargada, la 6 muestra sus valores en vez de un cambio.
    expect(
      within(versionItem(6)).queryByText(/Árboles de/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Versión 5' }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Cargar más versiones' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Versión 5' }),
    ).toBeInTheDocument();
    expect(
      within(versionItem(6)).getByText(
        'Árboles de CCN-51 (marzo de 2021): 1.005 → 1.006',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cargar más versiones' }),
    ).not.toBeInTheDocument();
  });

  it('offers no way to load more when everything is shown', async () => {
    server.use(characterizationHistoryHandler(threeVersions));
    render();
    await screen.findByRole('heading', { name: 'Versión 1' });

    expect(
      screen.queryByRole('button', { name: 'Cargar más versiones' }),
    ).not.toBeInTheDocument();
  });

  it('explains that a plot without versions has no history yet', async () => {
    server.use(characterizationHistoryHandler([]));
    render();

    expect(
      await screen.findByText('Esta parcela todavía no tiene versiones'),
    ).toBeInTheDocument();
  });

  it('says it needs a connection instead of loading forever', async () => {
    onlineManager.setOnline(false);
    server.use(characterizationHistoryHandler(threeVersions));
    render();

    expect(
      await screen.findByText(
        'Necesitas conexión para ver el historial de la ficha.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /^Versión/ }),
    ).not.toBeInTheDocument();
  });

  it('lets retry when the history cannot be read', async () => {
    server.use(
      http.get(apiUrl('/api/plot-characterizations/:plotId/history'), () =>
        apiError(500, 'internal_error'),
      ),
    );
    render();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /No fue posible cargar el historial/,
    );
    server.use(characterizationHistoryHandler(threeVersions));
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByRole('heading', { name: 'Versión 3' }),
    ).toBeInTheDocument();
  });

  it('links back to the farm and to the characterization of the plot', async () => {
    server.use(characterizationHistoryHandler(threeVersions));
    render();
    await screen.findByRole('heading', { name: 'Versión 3' });

    expect(screen.getByRole('link', { name: 'La Esperanza' })).toHaveAttribute(
      'href',
      FARM.detailPath,
    );
    expect(
      screen.getByRole('link', { name: 'Volver a la caracterización' }),
    ).toHaveAttribute(
      'href',
      expect.stringContaining('/fincas/parcelas/caracterizacion?'),
    );
  });
});
