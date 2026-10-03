import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { getOfflineDb } from '@/lib/offline/db';
import { buildPlot, buildSession, buildVertex } from '@/test/factories';
import { apiUrl, plotsHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

vi.mock('@/config/map', async () => {
  const { loadFakePointsMap } = await import('@/test/fake-map');
  return { loadPointsMapProvider: loadFakePointsMap };
});

import { enqueuePlotCreate } from '../plot-queue';
import { FarmPlotsSection } from './farm-plots-section';

const BOUNDARY = [
  buildVertex('-72.5000000', '7.8000000'),
  buildVertex('-72.4990000', '7.8000000'),
  buildVertex('-72.4990000', '7.8010000'),
];

const FARM = {
  id: 'f1',
  name: 'La Esperanza',
  areaHectares: '10.00',
  allocatedAreaHectares: '6.00',
  location: { latitude: '7.8234567', longitude: '-72.5123456' },
  isActive: true,
};

let userId: string;

beforeEach(() => {
  userId = `plots-section-${crypto.randomUUID()}`;
});

function renderSection({
  permissions = [PERMISSIONS.FARMS_VIEW, PERMISSIONS.PLOTS_VIEW] as string[],
  farm = FARM as Parameters<typeof FarmPlotsSection>[0]['farm'],
} = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions }),
  );
  return renderWithProviders(<FarmPlotsSection farm={farm} />, {
    queryClient,
  });
}

describe('FarmPlotsSection', () => {
  it('shows the assigned area, the plots and a map with the farm and the polygons', async () => {
    server.use(
      plotsHandler([
        buildPlot({ id: 'a', code: 'P1', boundary: BOUNDARY }),
        buildPlot({ id: 'b', code: 'P2', area_hectares: '3.60' }),
      ]),
    );
    renderSection();

    expect(
      await screen.findByRole('heading', {
        name: /Parcelas de esta finca · 2/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('6 de 10 ha asignadas · 4 ha disponibles'),
    ).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '60',
    );
    const map = await screen.findByRole('region', {
      name: 'Mapa de la finca y sus parcelas',
    });
    expect(within(map).getByText(/La Esperanza \(ok\)/)).toBeInTheDocument();
    expect(within(map).getByText('P1 (ok) 3 vértices')).toBeInTheDocument();
    expect(within(map).queryByText(/P2/)).not.toBeInTheDocument();
  });

  it('marks the plots without a polygon and offers the map only to the others', async () => {
    server.use(
      plotsHandler([
        buildPlot({ id: 'a', code: 'P1', boundary: BOUNDARY }),
        buildPlot({ id: 'b', code: 'P2', is_active: false }),
      ]),
    );
    renderSection();

    const [first, second] = within(
      await screen.findByRole('list', { name: 'Parcelas' }),
    ).getAllByRole('article');
    expect(
      within(first).getByRole('button', { name: 'Ver P1 en el mapa' }),
    ).toBeInTheDocument();
    expect(within(second).getByText('Sin polígono')).toBeInTheDocument();
    expect(within(second).getByText('Inactiva')).toBeInTheDocument();
    expect(within(second).queryByRole('button')).not.toBeInTheDocument();
  });

  it('points the map at the plot when asked to show it', async () => {
    const user = userEvent.setup();
    Element.prototype.scrollIntoView = vi.fn();
    server.use(plotsHandler([buildPlot({ id: 'a', boundary: BOUNDARY })]));
    renderSection();

    await user.click(
      await screen.findByRole('button', { name: 'Ver P1 en el mapa' }),
    );

    expect(await screen.findByText('Enfocado: a')).toBeInTheDocument();
  });

  it('invites to register plots when the farm has none', async () => {
    server.use(plotsHandler([]));
    renderSection();

    expect(
      await screen.findByText('Esta finca aún no tiene parcelas'),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('region', {
        name: 'Mapa de la finca y sus parcelas',
      }),
    ).toBeInTheDocument();
  });

  it('leaves out the area bar when the allocated area is not known', async () => {
    server.use(plotsHandler([]));
    renderSection({ farm: { ...FARM, allocatedAreaHectares: undefined } });

    await screen.findByText('Esta finca aún no tiene parcelas');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows nothing and asks for nothing without the permission to view plots', async () => {
    const requests: URLSearchParams[] = [];
    server.use(plotsHandler([buildPlot()], requests));
    renderSection({ permissions: [PERMISSIONS.FARMS_VIEW] });

    await waitFor(() =>
      expect(screen.queryByRole('status')).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByText(/Parcelas de esta finca/),
    ).not.toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it('warns when the farm has more plots than one page', async () => {
    server.use(
      http.get(apiUrl('/api/plots'), () =>
        HttpResponse.json({
          count: 101,
          next: 'http://x/api/plots?page=2',
          previous: null,
          results: [buildPlot()],
        }),
      ),
    );
    renderSection();

    expect(
      await screen.findByText(/tiene más parcelas de las que se muestran/),
    ).toBeInTheDocument();
  });

  it('says the plots could not be loaded and lets the person retry', async () => {
    server.use(http.get(apiUrl('/api/plots'), () => HttpResponse.error()));
    renderSection();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible cargar las parcelas',
    );
    expect(
      screen.getByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument();
  });

  describe('registering and editing', () => {
    const ALL = [
      PERMISSIONS.FARMS_VIEW,
      PERMISSIONS.PLOTS_VIEW,
      PERMISSIONS.PLOTS_ADD,
      PERMISSIONS.PLOTS_CHANGE,
    ] as string[];

    it('offers to register a plot, also from the empty state', async () => {
      server.use(plotsHandler([]));
      renderSection({ permissions: ALL });

      expect(
        await screen.findByRole('link', { name: 'Registrar parcela' }),
      ).toHaveAttribute('href', '/fincas/parcelas/nueva?finca=f1');
    });

    it('offers it next to the title once there are plots', async () => {
      server.use(plotsHandler([buildPlot()]));
      renderSection({ permissions: ALL });

      expect(
        await screen.findByRole('link', { name: 'Registrar parcela' }),
      ).toBeInTheDocument();
    });

    it('does not offer it without the permission or in an inactive farm', async () => {
      server.use(plotsHandler([buildPlot()]));
      const first = renderSection();
      await screen.findByText('P1');
      expect(
        screen.queryByRole('link', { name: 'Registrar parcela' }),
      ).not.toBeInTheDocument();
      first.unmount();

      renderSection({ permissions: ALL, farm: { ...FARM, isActive: false } });
      await screen.findByText('P1');
      expect(
        screen.queryByRole('link', { name: 'Registrar parcela' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: 'Editar P1' }),
      ).not.toBeInTheDocument();
    });

    it('offers to edit each plot with the farm in the address', async () => {
      server.use(plotsHandler([buildPlot({ id: 'a', code: 'P1' })]));
      renderSection({ permissions: ALL });

      expect(
        await screen.findByRole('link', { name: 'Editar P1' }),
      ).toHaveAttribute('href', '/fincas/parcelas/editar?id=a&finca=f1');
    });

    it('shows the plots that wait on the device, and offers to correct one that failed', async () => {
      server.use(plotsHandler([buildPlot({ id: 'a', code: 'P1' })]));
      await enqueuePlotCreate(userId, 'q1', 'f1', {
        code: 'P-pendiente',
        area_hectares: '1.00',
        vertices: [],
      });
      await enqueuePlotCreate(userId, 'q2', 'f1', {
        code: 'P-con-error',
        area_hectares: '1.00',
        vertices: [],
      });
      await getOfflineDb(userId).queue.update('q2', {
        status: 'error',
        errorCode: 'plot_overlap',
        errorMessage: 'Se superpone con otra parcela.',
      });
      renderSection({ permissions: ALL });

      const articles = within(
        await screen.findByRole('list', { name: 'Parcelas' }),
      ).getAllByRole('article');
      expect(articles).toHaveLength(3);
      expect(
        screen.getByText('Pendiente de sincronización'),
      ).toBeInTheDocument();
      expect(screen.getByText('Pendiente con error')).toBeInTheDocument();
      expect(
        screen.getByText('Se superpone con otra parcela.'),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'Corregir P-con-error' }),
      ).toHaveAttribute('href', '/fincas/parcelas/editar?id=q2&finca=f1');
    });

    it('discards a plot that failed, after confirming, and not one that is still pending', async () => {
      server.use(plotsHandler([]));
      await enqueuePlotCreate(userId, 'q1', 'f1', {
        code: 'P-pendiente',
        area_hectares: '1.00',
        vertices: [],
      });
      await enqueuePlotCreate(userId, 'q2', 'f1', {
        code: 'P-con-error',
        area_hectares: '1.00',
        vertices: [],
      });
      await getOfflineDb(userId).queue.update('q2', {
        status: 'error',
        errorCode: 'plot_overlap',
        errorMessage: 'x',
      });
      const user = userEvent.setup();
      renderSection({ permissions: ALL });

      const buttons = await screen.findAllByRole('button', {
        name: 'Descartar',
      });
      expect(buttons).toHaveLength(1);
      await user.click(buttons[0]);
      await user.click(
        await screen.findByRole('button', { name: 'Descartar parcela' }),
      );

      await waitFor(async () =>
        expect(await getOfflineDb(userId).queue.get('q2')).toBeUndefined(),
      );
      expect(await getOfflineDb(userId).queue.get('q1')).toBeDefined();
    });

    it('does not offer to correct a plot whose farm or plot no longer exists', async () => {
      server.use(plotsHandler([]));
      await enqueuePlotCreate(userId, 'q1', 'f1', {
        code: 'P1',
        area_hectares: '1.00',
        vertices: [],
      });
      await getOfflineDb(userId).queue.update('q1', {
        status: 'error',
        errorCode: 'plot_deleted',
        errorMessage: 'Eliminada.',
      });
      renderSection({ permissions: ALL });

      expect(
        await screen.findByRole('button', { name: 'Descartar' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: 'Corregir P1' }),
      ).not.toBeInTheDocument();
    });

    it('asks the server again when a plot leaves the queue because it synced', async () => {
      const requests: URLSearchParams[] = [];
      server.use(plotsHandler([], requests));
      await enqueuePlotCreate(userId, 'q1', 'f1', {
        code: 'P-pendiente',
        area_hectares: '1.00',
        vertices: [],
      });
      renderSection({ permissions: ALL });
      await screen.findByText('P-pendiente');
      const before = requests.length;

      await getOfflineDb(userId).queue.delete('q1');

      await waitFor(() => expect(requests.length).toBeGreaterThan(before));
    });

    it('shows only the device plots of a farm that is not on the server yet, without asking for more', async () => {
      const requests: URLSearchParams[] = [];
      server.use(plotsHandler([], requests));
      await enqueuePlotCreate(userId, 'q1', 'f1', {
        code: 'P-pendiente',
        area_hectares: '1.00',
        vertices: [],
      });
      renderSection({
        permissions: ALL,
        farm: {
          ...FARM,
          allocatedAreaHectares: undefined,
          isPendingCreate: true,
        },
      });

      expect(await screen.findByText('P-pendiente')).toBeInTheDocument();
      expect(requests).toHaveLength(0);
    });
  });
});
