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
  it('muestra lo registrado y las acciones según los permisos', async () => {
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

  it('sin permisos de cambio solo consulta', async () => {
    renderScreen([PERMISSIONS.HARVESTS_VIEW]);

    await screen.findByRole('heading', { name: '120,5 kg en verde' });
    expect(screen.queryByRole('link', { name: /Corregir/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Eliminar/ })).toBeNull();
  });

  it('una cosecha en un lote ya no se modifica', async () => {
    serve(
      buildHarvest({
        lot: { id: 'l1', code: '000123-F02-P05-261014-1', status: 'generated' },
      }),
    );
    renderScreen(ALL, { lotHref: (id) => `/lotes/detalle?id=${id}` });

    const notice = await screen.findByText(/Esta cosecha forma el lote/);
    expect(
      within(notice).getByRole('link', { name: '000123-F02-P05-261014-1' }),
    ).toHaveAttribute('href', '/lotes/detalle?id=l1');
    expect(screen.queryByRole('link', { name: /Corregir/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Eliminar/ })).toBeNull();
  });

  it('sin conexión corregir y eliminar quedan deshabilitados', async () => {
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

  it('avisa si la cosecha ya no existe', async () => {
    server.use(
      http.get(apiUrl('/api/harvests/h1'), () => apiError(404, 'not_found')),
    );
    renderScreen();

    expect(
      await screen.findByText('Esta cosecha ya no existe.'),
    ).toBeInTheDocument();
  });

  it('elimina con la versión leída y vuelve a la lista', async () => {
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

  it('si ya forma un lote no la elimina y lo explica', async () => {
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
