import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { apiError, buildLot, buildSession } from '@/test/factories';
import {
  apiUrl,
  cacaoVarietiesHandler,
  farmsHandler,
  lotSummaryHandler,
  lotsHandler,
  plotsHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { resetLocation } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { Play, RotateCw } from 'lucide-react';

import { LotListScreen } from './lot-list-screen';

const generated = buildLot();
const fermenting = buildLot({
  id: 'l2',
  code: '000123-F02-P05-261012-1',
  status: 'fermenting',
  fermentation: {
    started_at: '2026-10-15T07:00:00-05:00',
    ended_at: null,
    facility: 'C-02',
  },
});

let userId: string;
let urls: string[];
let requests: URLSearchParams[];
let summaryRequests: URLSearchParams[];

const SUMMARY = [
  { status: 'generated', count: 3, green_weight_kg: '420.5' },
  { status: 'fermenting', count: 1, green_weight_kg: '120.0' },
  { status: 'fermented', count: 0, green_weight_kg: '0.0' },
  { status: 'drying', count: 0, green_weight_kg: '0.0' },
  { status: 'dried', count: 0, green_weight_kg: '0.0' },
];

beforeEach(() => {
  userId = `lot-list-${crypto.randomUUID()}`;
  urls = [];
  requests = [];
  summaryRequests = [];
  resetLocation();
  server.use(
    lotsHandler([generated, fermenting], requests),
    lotSummaryHandler(SUMMARY, summaryRequests),
    farmsHandler(),
    plotsHandler(),
    cacaoVarietiesHandler(),
  );
});

function renderScreen({
  searchParams = '',
  permissions = [PERMISSIONS.LOTS_VIEW, PERMISSIONS.LOTS_ADD],
  lotActions,
  stageAction,
}: {
  searchParams?: string;
  permissions?: string[];
  lotActions?: ComponentProps<typeof LotListScreen>['lotActions'];
  stageAction?: ComponentProps<typeof LotListScreen>['stageAction'];
} = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions }),
  );
  renderWithProviders(
    <LotListScreen
      formLotHref="/cosechas?lote=sin"
      lotActions={lotActions}
      stageAction={stageAction}
    />,
    {
      queryClient,
      searchParams,
      onUrlUpdate: ({ queryString }) => urls.push(queryString),
    },
  );
}

const table = () => screen.findByRole('table', { name: 'Lotes' });

describe('LotListScreen', () => {
  it('shows the yield of a dried lot under its status', async () => {
    server.use(
      lotsHandler([
        buildLot({
          id: 'l3',
          code: '000123-F02-P05-261010-1',
          status: 'dried',
          drying: {
            started_at: '2026-10-20T14:00:00-05:00',
            ended_at: '2026-10-25T10:00:00-05:00',
            facility: 'M-01',
            final_moisture_pct: '7.0',
            dry_weight_kg: '60.0',
            yield_pct: '49.8',
          },
        }),
      ]),
    );
    renderScreen();

    const [row] = within(await table())
      .getAllByRole('row')
      .slice(1);
    expect(row).toHaveTextContent('Seco');
    expect(row).toHaveTextContent('Rendimiento 49,8 %');
  });

  it('lists the lots with their code, origin and status', async () => {
    renderScreen();

    const rows = within(await table())
      .getAllByRole('row')
      .slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('000123-F02-P05-261014-1'),
      expect.stringContaining('000123-F02-P05-261012-1'),
    ]);
    expect(rows[0]).toHaveTextContent('P05 · Lote del río');
    expect(rows[0]).toHaveTextContent('Generado');
    expect(rows[1]).toHaveTextContent('En fermentación');
    expect(rows[1]).toHaveTextContent('En C-02');
    expect(
      screen.getByRole('link', { name: 'Ver el lote 000123-F02-P05-261014-1' }),
    ).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/lotes\/detalle\?id=l1&origen=/),
    );
    expect(requests[0].get('page_size')).toBe('20');
  });

  it('offers each lot the actions of its stage in a menu, and none when it has none', async () => {
    renderScreen({
      lotActions: (lot) =>
        lot.status === 'generated'
          ? [
              {
                id: 'start',
                label: 'Iniciar fermentación',
                href: '/fermentacion?vista=listos&iniciar=l1',
                icon: Play,
              },
            ]
          : lot.status === 'fermenting'
            ? [
                {
                  id: 'turn',
                  label: 'Registrar volteo',
                  href: '/fermentacion/volteo?lote=l2',
                  icon: RotateCw,
                },
              ]
            : [],
    });

    await table();
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Más acciones del lote 000123-F02-P05-261014-1',
      }),
    );
    expect(
      await screen.findByRole('menuitem', { name: 'Iniciar fermentación' }),
    ).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/fermentacion\?vista=listos&iniciar=l1/),
    );
    expect(
      screen.getByRole('button', {
        name: 'Más acciones del lote 000123-F02-P05-261012-1',
      }),
    ).toBeInTheDocument();
  });

  it('leads the header button to where the chosen status is worked, and keeps the harvests next to it', async () => {
    renderScreen({
      searchParams: '?estado=fermenting',
      stageAction: (status) =>
        status === 'fermenting'
          ? {
              id: 'go',
              label: 'Ir a Fermentación',
              href: '/fermentacion',
              icon: Play,
            }
          : null,
    });

    const stage = await screen.findByRole('link', {
      name: 'Ir a Fermentación',
    });
    expect(stage).toHaveAttribute('href', '/fermentacion');
    expect(
      screen.getByRole('link', { name: 'Cosechas sin lote' }),
    ).toHaveAttribute('href', '/cosechas?lote=sin');
  });

  it('keeps the harvests as the main button when the status has nowhere to lead', async () => {
    renderScreen({
      searchParams: '?estado=fermented',
      stageAction: () => null,
    });

    expect(
      await screen.findByRole('link', { name: 'Cosechas sin lote' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Ir a Fermentación' }),
    ).not.toBeInTheDocument();
  });

  it('does not lead anywhere from the list of every status', async () => {
    renderScreen({
      stageAction: () => ({
        id: 'go',
        label: 'Ir a Fermentación',
        href: '/fermentacion',
        icon: Play,
      }),
    });

    await screen.findByRole('link', { name: 'Cosechas sin lote' });
    expect(
      screen.queryByRole('link', { name: 'Ir a Fermentación' }),
    ).not.toBeInTheDocument();
  });

  it('shows no menu when the screen gives no actions', async () => {
    renderScreen();

    await table();
    expect(
      screen.queryByRole('button', { name: /Más acciones del lote/ }),
    ).not.toBeInTheDocument();
  });

  it('filters by status and writes it in the address', async () => {
    renderScreen();
    await table();

    await userEvent.click(
      within(screen.getByRole('group', { name: 'Estado' })).getByRole(
        'button',
        { name: /^En fermentación/ },
      ),
    );

    await waitFor(() => expect(urls.at(-1)).toContain('estado=fermenting'));
    await waitFor(() =>
      expect(requests.at(-1)?.get('status')).toBe('fermenting'),
    );
  });

  it('shows how many lots and kilos each status has, with the other filters', async () => {
    renderScreen({ searchParams: '?estado=fermenting&finca=f1&pagina=2' });

    const statuses = screen.getByRole('group', { name: 'Estado' });
    expect(
      await within(statuses).findByRole('button', {
        name: 'Todos 4 lotes · 540,5 kg',
      }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      within(statuses).getByRole('button', {
        name: 'Generado 3 lotes · 420,5 kg',
      }),
    ).toBeInTheDocument();
    expect(
      within(statuses).getByRole('button', {
        name: 'En fermentación 1 lote · 120 kg',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    const sent = summaryRequests[0];
    expect(sent.get('farm')).toBe('f1');
    expect(sent.has('status')).toBe(false);
    expect(sent.has('page')).toBe(false);
  });

  it('still filters by status when the summary fails', async () => {
    server.use(
      http.get(apiUrl('/api/lots/summary'), () =>
        apiError(500, 'server_error'),
      ),
    );
    renderScreen();
    await table();

    await userEvent.click(screen.getByRole('button', { name: /^Seco/ }));

    await waitFor(() => expect(urls.at(-1)).toContain('estado=dried'));
  });

  it('sends what the address says to the server, ignoring a malformed date', async () => {
    renderScreen({
      searchParams: '?buscar=F02-P05&finca=f1&desde=2026-10-01&hasta=ayer',
    });
    await table();

    const sent = requests[0];
    expect(sent.get('search')).toBe('F02-P05');
    expect(sent.get('farm')).toBe('f1');
    expect(sent.get('from')).toBe('2026-10-01');
    expect(sent.has('to')).toBe(false);
  });

  it('leads to the harvests without a lot to form one', async () => {
    renderScreen();

    expect(
      await screen.findByRole('link', { name: 'Cosechas sin lote' }),
    ).toHaveAttribute('href', '/cosechas?lote=sin');
  });

  it('does not offer to form a lot without the permission', async () => {
    renderScreen({ permissions: [PERMISSIONS.LOTS_VIEW] });
    await table();

    expect(
      screen.queryByRole('link', { name: 'Cosechas sin lote' }),
    ).toBeNull();
  });

  it('says when no lot matches the filters, and clears them', async () => {
    server.use(lotsHandler([], requests));
    renderScreen({ searchParams: '?estado=dried' });

    expect(
      await screen.findByText('No se encontraron lotes'),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Limpiar filtros' })[0],
    );
    await waitFor(() => expect(urls.at(-1)).not.toContain('estado'));
  });

  it('says when there are no lots yet', async () => {
    server.use(lotsHandler([], requests));
    renderScreen();

    expect(await screen.findByText('Aún no hay lotes')).toBeInTheDocument();
  });

  it('shows an error of the api', async () => {
    server.use(
      http.get(apiUrl('/api/lots'), () => apiError(500, 'server_error')),
    );
    renderScreen();

    expect(
      await screen.findByText('No fue posible cargar los lotes.'),
    ).toBeInTheDocument();
  });
});
