import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { apiError, buildHarvest, buildSession } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { resetLocation, router } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { HarvestDetailScreen } from './harvest-detail-screen';

const ALL = [
  PERMISSIONS.HARVESTS_VIEW,
  PERMISSIONS.HARVESTS_CHANGE,
  PERMISSIONS.HARVESTS_DELETE,
];

let userId: string;
let deletes: string[];

function serve(harvest: ReturnType<typeof buildHarvest>) {
  server.use(
    http.get(apiUrl(`/api/harvests/${harvest.id}`), () =>
      HttpResponse.json(harvest),
    ),
  );
}

beforeEach(() => {
  userId = `harvest-detail-${crypto.randomUUID()}`;
  deletes = [];
  vi.clearAllMocks();
  resetLocation();
  serve(buildHarvest());
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderScreen(
  permissions: string[] = ALL,
  props: Partial<Parameters<typeof HarvestDetailScreen>[0]> = {},
) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions }),
  );
  renderWithProviders(<HarvestDetailScreen harvestId="h1" {...props} />, {
    queryClient,
  });
}

describe('HarvestDetailScreen', () => {
  it('shows what was recorded and the actions the permissions allow', async () => {
    renderScreen(ALL, { historyHref: () => '/ficha/historial?id=pl1' });

    expect(
      await screen.findByRole('heading', { name: '120,5 kg en verde' }),
    ).toBeInTheDocument();
    expect(screen.getByText('CCN-51')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Versión 1' })).toHaveAttribute(
      'href',
      '/ficha/historial?id=pl1',
    );
    expect(
      screen.getByRole('link', { name: /Corregir cosecha/ }),
    ).toHaveAttribute(
      'href',
      expect.stringContaining('/cosechas/registrar?id=h1'),
    );
    expect(
      screen.getByRole('button', { name: /Eliminar/ }),
    ).toBeInTheDocument();
  });

  it('hands the harvest to whoever forms its lot, only while it has none', async () => {
    const formLot = vi.fn(() => <button type="button">Conformar lote</button>);
    renderScreen(ALL, { renderFormLot: formLot });

    expect(
      await screen.findByRole('button', { name: 'Conformar lote' }),
    ).toBeInTheDocument();
    expect(formLot).toHaveBeenCalledWith({
      harvestId: 'h1',
      plot: 'P05 · Lote del río',
      farm: 'F02 · La Esperanza',
      harvestDate: '2026-10-14',
      greenWeightKg: '120.5',
      variety: 'CCN-51',
    });
  });

  it('only reads without permission to change', async () => {
    renderScreen([PERMISSIONS.HARVESTS_VIEW]);

    await screen.findByRole('heading', { name: '120,5 kg en verde' });
    expect(screen.queryByRole('link', { name: /Corregir/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Eliminar/ })).toBeNull();
  });

  it('does not change a harvest that forms a lot', async () => {
    serve(
      buildHarvest({
        lot: { id: 'l1', code: '000123-F02-P05-261014-1', status: 'generated' },
      }),
    );
    const formLot = vi.fn(() => null);
    renderScreen(ALL, {
      lotHref: (id) => `/lotes/detalle?id=${id}`,
      renderFormLot: formLot,
    });

    const notice = await screen.findByText(/Esta cosecha forma el lote/);
    expect(
      within(notice).getByRole('link', { name: '000123-F02-P05-261014-1' }),
    ).toHaveAttribute('href', '/lotes/detalle?id=l1');
    expect(screen.queryByRole('link', { name: /Corregir/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Eliminar/ })).toBeNull();
    expect(formLot).not.toHaveBeenCalled();
  });

  it('disables correcting and deleting without a connection', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderScreen();

    expect(
      await screen.findByRole('button', {
        name: 'Corregir (necesita conexión)',
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Eliminar (necesita conexión)' }),
    ).toBeDisabled();
  });

  it('says when the harvest no longer exists', async () => {
    server.use(
      http.get(apiUrl('/api/harvests/h1'), () => apiError(404, 'not_found')),
    );
    renderScreen();

    expect(
      await screen.findByText('Esta cosecha ya no existe.'),
    ).toBeInTheDocument();
  });

  it('deletes with the version read and goes back to the list', async () => {
    server.use(
      http.delete(apiUrl('/api/harvests/h1'), ({ request }) => {
        deletes.push(new URL(request.url).search);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderScreen();

    await userEvent.click(
      await screen.findByRole('button', { name: /Eliminar/ }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('P05 · Lote del río');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Eliminar cosecha' }),
    );

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/cosechas'),
    );
    expect(deletes).toEqual(['?expected_version=1']);
  });

  it('explains, without deleting, a harvest that already forms a lot', async () => {
    server.use(
      http.delete(apiUrl('/api/harvests/h1'), () =>
        apiError(409, 'harvest_in_lot'),
      ),
    );
    renderScreen();

    await userEvent.click(
      await screen.findByRole('button', { name: /Eliminar/ }),
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Eliminar cosecha' }),
    );

    expect(
      await within(dialog).findByText(
        'Esta cosecha ya forma un lote: no se puede eliminar.',
      ),
    ).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
