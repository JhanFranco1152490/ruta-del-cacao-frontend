import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { apiError, buildLot, buildSession } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { resetLocation, router } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { LotDetailScreen } from './lot-detail-screen';

const ALL = [PERMISSIONS.LOTS_VIEW, PERMISSIONS.LOTS_DELETE];

let deletes: string[];

const serve = (lot: ReturnType<typeof buildLot>) =>
  server.use(
    http.get(apiUrl(`/api/lots/${lot.id}`), () => HttpResponse.json(lot)),
  );

beforeEach(() => {
  deletes = [];
  vi.clearAllMocks();
  resetLocation();
  serve(buildLot());
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderScreen(
  permissions: string[] = ALL,
  props: Partial<Parameters<typeof LotDetailScreen>[0]> = {},
) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: 'u1', permissions }),
  );
  renderWithProviders(<LotDetailScreen lotId="l1" {...props} />, {
    queryClient,
  });
}

const deleteButton = () => screen.queryByRole('button', { name: /Eliminar/ });

describe('LotDetailScreen', () => {
  it('shows the code, how to read it, its status and its origin', async () => {
    renderScreen(ALL, {
      harvestHref: (lot) => `/cosechas/detalle?id=${lot.harvest.id}`,
      historyHref: () => '/ficha/historial?id=pl1',
    });

    expect(
      await screen.findByRole('heading', { name: '000123-F02-P05-261014-1' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Productor PROD-000123 · Finca F02, La Esperanza · Parcela P05, Lote del río · Cosecha del 14 de octubre de 2026 · Primer lote de ese día',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Generado')).toBeInTheDocument();
    const origin = screen.getByRole('region', { name: 'Origen' });
    expect(origin).toHaveTextContent('120,5 kg');
    expect(origin).toHaveTextContent('PROD-000123');
    expect(
      within(origin).getByRole('link', { name: '14 de octubre de 2026' }),
    ).toHaveAttribute('href', '/cosechas/detalle?id=h1');
    expect(
      within(origin).getByRole('link', { name: 'Versión 1' }),
    ).toHaveAttribute('href', '/ficha/historial?id=pl1');
  });

  it('copies the code', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    // jsdom no trae portapapeles.
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    renderScreen();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Copiar código' }),
    );

    expect(writeText).toHaveBeenCalledWith('000123-F02-P05-261014-1');
    expect(await screen.findByText('Código copiado')).toBeInTheDocument();
  });

  it('offers to delete only a generated lot, with the permission', async () => {
    renderScreen([PERMISSIONS.LOTS_VIEW]);
    await screen.findByRole('button', { name: 'Copiar código' });
    expect(deleteButton()).toBeNull();
  });

  it('does not offer to delete a lot that is already in process', async () => {
    serve(buildLot({ status: 'fermenting' }));
    renderScreen();

    await screen.findByText('En fermentación');
    expect(deleteButton()).toBeNull();
  });

  it('deletes with the version read and goes back to the list', async () => {
    server.use(
      http.delete(apiUrl('/api/lots/l1'), ({ request }) => {
        deletes.push(new URL(request.url).search);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderScreen();

    await userEvent.click(
      await screen.findByRole('button', { name: /Eliminar/ }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(
      '¿Eliminar el lote 000123-F02-P05-261014-1?',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Eliminar lote' }),
    );

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/lotes'));
    expect(deletes).toEqual(['?expected_version=1']);
  });

  it('explains, without deleting, a lot that moved on meanwhile', async () => {
    server.use(
      http.delete(apiUrl('/api/lots/l1'), () =>
        apiError(409, 'lot_invalid_status'),
      ),
    );
    renderScreen();

    await userEvent.click(
      await screen.findByRole('button', { name: /Eliminar/ }),
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Eliminar lote' }),
    );

    expect(
      await within(dialog).findByText(
        'Este lote ya tiene proceso registrado: solo se elimina un lote Generado.',
      ),
    ).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('says when the lot no longer exists', async () => {
    server.use(
      http.get(apiUrl('/api/lots/l1'), () => apiError(404, 'not_found')),
    );
    renderScreen();

    expect(
      await screen.findByText('Este lote ya no existe.'),
    ).toBeInTheDocument();
  });
});
