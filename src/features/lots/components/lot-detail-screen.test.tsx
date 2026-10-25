import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { getOfflineDb } from '@/lib/offline/db';
import {
  apiError,
  buildFermentation,
  buildLot,
  buildSession,
} from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { mockLocation, resetLocation, router } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { LotDetailScreen } from './lot-detail-screen';

const ALL = [PERMISSIONS.LOTS_VIEW, PERMISSIONS.LOTS_DELETE];

let deletes: string[];
let userId: string;

const serve = (lot: ReturnType<typeof buildLot>) =>
  server.use(
    http.get(apiUrl(`/api/lots/${lot.id}`), () => HttpResponse.json(lot)),
  );

beforeEach(() => {
  deletes = [];
  userId = `lot-detail-${crypto.randomUUID()}`;
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
  lotId = 'l1',
) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions }),
  );
  renderWithProviders(<LotDetailScreen lotId={lotId} {...props} />, {
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
    ).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/cosechas\/detalle\?id=h1&origen=/),
    );
    expect(
      within(origin).getByRole('link', { name: 'Versión 1' }),
    ).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/ficha\/historial\?id=pl1/),
    );
  });

  // Fermentación y secado son de otros dominios: la ficha muestra lo que le entregan, después del
  // origen.
  it('shows the sections that other modules give it, after the origin', async () => {
    renderScreen(ALL, {
      renderSections: (lot) => (
        <section aria-label="Fermentación">Sección de {lot.code}</section>
      ),
    });

    const section = await screen.findByRole('region', { name: 'Fermentación' });
    expect(section).toHaveTextContent('Sección de 000123-F02-P05-261014-1');
    expect(
      screen
        .getByRole('region', { name: 'Origen' })
        .compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('offers to go back to where the lot was formed', async () => {
    mockLocation.search = new URLSearchParams({
      id: 'l1',
      origen: '/cosechas?lote=sin',
    }).toString();
    renderScreen();

    expect(await screen.findByRole('link', { name: 'Volver' })).toHaveAttribute(
      'href',
      '/cosechas?lote=sin',
    );
  });

  it('goes back to the list of lots when it was opened directly', async () => {
    renderScreen();

    expect(await screen.findByRole('link', { name: 'Volver' })).toHaveAttribute(
      'href',
      '/lotes',
    );
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

  // Sin conexión, un lote en fermentación se abre con la copia de la lista de Fermentación.
  it('opens a lot in fermentation from the copy without a connection', async () => {
    await getOfflineDb(userId).cache.put({
      key: 'fermentation',
      value: [buildFermentation()],
      fetchedAt: 1_760_000_000_000,
    });
    server.use(http.get(apiUrl('/api/lots/l1'), () => HttpResponse.error()));
    renderScreen(ALL, {
      renderSections: (lot) => (
        <section aria-label="Fermentación">
          {lot.fermentation?.facility}
        </section>
      ),
    });

    expect(
      await screen.findByRole('heading', { name: '000123-F02-P05-261014-1' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sin conexión: estás viendo la copia del/),
    ).toBeInTheDocument();
    expect(screen.getByText('En fermentación')).toBeInTheDocument();
    const origin = screen.getByRole('region', { name: 'Origen' });
    expect(origin).toHaveTextContent('Lote del río');
    expect(origin).toHaveTextContent('Productor—');
    expect(screen.queryByText(/Conformado por/)).not.toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Fermentación' }),
    ).toHaveTextContent('C-01');
  });

  it('asks for a connection for a lot that is in no copy', async () => {
    server.use(http.get(apiUrl('/api/lots/l9'), () => HttpResponse.error()));
    renderScreen(ALL, {}, 'l9');

    expect(
      await screen.findByRole('heading', {
        name: 'Ver este lote necesita conexión.',
      }),
    ).toBeInTheDocument();
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
