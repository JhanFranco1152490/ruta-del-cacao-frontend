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

// El estado se dice en la insignia y también en la etapa resaltada.
const BADGE = '[data-slot="badge"]';

describe('LotDetailScreen', () => {
  it('shows the code in named pieces, its figures, its status and its origin', async () => {
    renderScreen(ALL, {
      harvestHref: (lot) => `/cosechas/detalle?id=${lot.harvest.id}`,
      historyHref: () => '/ficha/historial?id=pl1',
    });

    expect(
      await screen.findByRole('heading', { name: '000123-F02-P05-261014-1' }),
    ).toBeInTheDocument();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('000123');
    expect(heading).toHaveTextContent('La Esperanza');
    expect(heading).toHaveTextContent('Lote del río');
    expect(heading).toHaveTextContent('14 de octubre de 2026');
    expect(heading).toHaveTextContent('Primer lote de ese día');
    expect(
      screen.getByText('Generado', { selector: BADGE }),
    ).toBeInTheDocument();
    const figures = screen.getByRole('region', { name: 'Resumen del lote' });
    expect(figures).toHaveTextContent('120,5 kg');
    expect(figures).toHaveTextContent('14 oct.');
    expect(figures).toHaveTextContent('CCN-51');
    expect(figures).toHaveTextContent('P05');
    const origin = screen.getByRole('region', { name: 'Origen' });
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

  it('says in which stage the lot is', async () => {
    serve(buildLot({ status: 'fermenting' }));
    renderScreen();

    const stages = await screen.findByRole('region', {
      name: 'Etapas del lote',
    });
    expect(
      within(stages).getByRole('listitem', { current: 'step' }),
    ).toHaveTextContent('En fermentación');
    expect(within(stages).getAllByRole('listitem')).toHaveLength(5);
  });

  it('ends who formed the lot with a single full stop', async () => {
    renderScreen();

    const description = await screen.findByText(/^Conformado por/);
    expect(description.textContent).toMatch(/[ap]\.m\.$/);
  });

  // Fermentación y secado son de otros dominios: la ficha muestra lo que le entregan, junto al
  // origen.
  it('shows the sections that other modules give it, next to the origin', async () => {
    renderScreen(ALL, {
      renderSections: (lot) => (
        <section aria-label="Fermentación">Sección de {lot.code}</section>
      ),
    });

    const section = await screen.findByRole('region', { name: 'Fermentación' });
    expect(section).toHaveTextContent('Sección de 000123-F02-P05-261014-1');
    expect(screen.getByRole('region', { name: 'Origen' })).toBeInTheDocument();
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

    await screen.findByText('En fermentación', { selector: BADGE });
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
    expect(
      screen.getByText('En fermentación', { selector: BADGE }),
    ).toBeInTheDocument();
    const origin = screen.getByRole('region', { name: 'Origen' });
    expect(
      screen.getByRole('region', { name: 'Resumen del lote' }),
    ).toHaveTextContent('Lote del río');
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
