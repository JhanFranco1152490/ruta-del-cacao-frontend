import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { apiError, buildPlot, buildSession } from '@/test/factories';
import { apiUrl, plotsHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

vi.mock('@/config/map', async () => {
  const { loadFakePointsMap } = await import('@/test/fake-map');
  return { loadPointsMapProvider: loadFakePointsMap };
});

import { FarmPlotsSection } from './farm-plots-section';

const FARM = {
  id: 'f1',
  name: 'La Esperanza',
  areaHectares: '10.00',
  allocatedAreaHectares: '2.00',
  location: { latitude: '7.8234567', longitude: '-72.5123456' },
  isActive: true,
};

const ALL = [
  PERMISSIONS.FARMS_VIEW,
  PERMISSIONS.PLOTS_VIEW,
  PERMISSIONS.PLOTS_ADD,
  PERMISSIONS.PLOTS_CHANGE,
  PERMISSIONS.PLOTS_DELETE,
] as string[];

let userId: string;

beforeEach(() => {
  userId = `plot-actions-${crypto.randomUUID()}`;
});

function renderSection(permissions: string[] = ALL, farm = FARM) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions }),
  );
  return {
    user: userEvent.setup(),
    ...renderWithProviders(<FarmPlotsSection farm={farm} />, { queryClient }),
  };
}

const capture = <T,>() => {
  const calls: T[] = [];
  return { calls };
};

describe('deactivating and reactivating a plot', () => {
  it('deactivates with the version that was read, after confirming', async () => {
    const bodies = capture<unknown>();
    server.use(
      plotsHandler([buildPlot({ id: 'a', version: 3 })]),
      http.patch(apiUrl('/api/plots/a'), async ({ request }) => {
        bodies.calls.push(await request.json());
        return HttpResponse.json(
          buildPlot({ id: 'a', is_active: false, version: 4 }),
        );
      }),
    );
    const { user } = renderSection();

    await user.click(await screen.findByRole('button', { name: 'Desactivar' }));
    await user.click(
      await screen.findByRole('button', { name: 'Desactivar parcela' }),
    );

    await waitFor(() =>
      expect(bodies.calls).toEqual([{ is_active: false, expected_version: 3 }]),
    );
  });

  it('offers to activate an inactive plot', async () => {
    server.use(plotsHandler([buildPlot({ is_active: false })]));
    renderSection();

    expect(
      await screen.findByRole('button', { name: 'Activar' }),
    ).toBeInTheDocument();
  });

  it('tells the person to edit the plot first when reactivating it overlaps another', async () => {
    server.use(
      plotsHandler([buildPlot({ id: 'a', is_active: false })]),
      http.patch(apiUrl('/api/plots/a'), () =>
        apiError(
          422,
          'plot_overlap',
          'El polígono se superpone con otra parcela de la finca.',
        ),
      ),
    );
    const { user } = renderSection();

    await user.click(await screen.findByRole('button', { name: 'Activar' }));
    await user.click(
      await screen.findByRole('button', { name: 'Activar parcela' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Edita la parcela primero',
    );
  });

  it('says someone changed the plot when the version is out of date', async () => {
    server.use(
      plotsHandler([buildPlot({ id: 'a' })]),
      http.patch(apiUrl('/api/plots/a'), () =>
        apiError(409, 'stale_version', 'Cambió.'),
      ),
    );
    const { user } = renderSection();

    await user.click(await screen.findByRole('button', { name: 'Desactivar' }));
    await user.click(
      await screen.findByRole('button', { name: 'Desactivar parcela' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Alguien cambió esta parcela',
    );
  });

  it('does not offer it without the permission or in an inactive farm', async () => {
    server.use(plotsHandler([buildPlot()]));
    const first = renderSection([
      PERMISSIONS.FARMS_VIEW,
      PERMISSIONS.PLOTS_VIEW,
    ]);
    await screen.findByText('P1');
    expect(
      screen.queryByRole('button', { name: 'Desactivar' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Eliminar' }),
    ).not.toBeInTheDocument();
    first.unmount();

    renderSection(ALL, { ...FARM, isActive: false });
    await screen.findByText('P1');
    expect(
      screen.queryByRole('button', { name: 'Desactivar' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Eliminar' }),
    ).not.toBeInTheDocument();
  });
});

describe('deleting a plot created by mistake', () => {
  const deleteRequests = (status = 204, body?: Response) => {
    const requests: URL[] = [];
    server.use(
      http.delete(apiUrl('/api/plots/a'), ({ request }) => {
        requests.push(new URL(request.url));
        return body ?? new HttpResponse(null, { status });
      }),
    );
    return requests;
  };

  it('deletes with the version in the address, after confirming', async () => {
    server.use(plotsHandler([buildPlot({ id: 'a', version: 2 })]));
    const requests = deleteRequests();
    const { user } = renderSection();

    await user.click(await screen.findByRole('button', { name: 'Eliminar' }));
    await user.click(
      await screen.findByRole('button', { name: 'Eliminar parcela' }),
    );

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].searchParams.get('expected_version')).toBe('2');
  });

  it('offers to deactivate instead when something depends on the plot', async () => {
    server.use(plotsHandler([buildPlot({ id: 'a', version: 2 })]));
    deleteRequests(409, apiError(409, 'plot_has_records', 'Tiene registros.'));
    const patches: unknown[] = [];
    server.use(
      http.patch(apiUrl('/api/plots/a'), async ({ request }) => {
        patches.push(await request.json());
        return HttpResponse.json(
          buildPlot({ id: 'a', is_active: false, version: 3 }),
        );
      }),
    );
    const { user } = renderSection();

    await user.click(await screen.findByRole('button', { name: 'Eliminar' }));
    await user.click(
      await screen.findByRole('button', { name: 'Eliminar parcela' }),
    );
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(
      await screen.findByRole('button', { name: 'Desactivar parcela' }),
    );

    await waitFor(() =>
      expect(patches).toEqual([{ is_active: false, expected_version: 2 }]),
    );
  });

  it('counts a plot that no longer exists as deleted', async () => {
    server.use(plotsHandler([buildPlot({ id: 'a' })]));
    deleteRequests(404, apiError(404, 'not_found', 'No encontrada.'));
    const { user } = renderSection();

    await user.click(await screen.findByRole('button', { name: 'Eliminar' }));
    await user.click(
      await screen.findByRole('button', { name: 'Eliminar parcela' }),
    );

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Eliminar parcela' }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says so when the version is out of date', async () => {
    server.use(plotsHandler([buildPlot({ id: 'a' })]));
    deleteRequests(409, apiError(409, 'stale_version', 'Cambió.'));
    const { user } = renderSection();

    await user.click(await screen.findByRole('button', { name: 'Eliminar' }));
    await user.click(
      await screen.findByRole('button', { name: 'Eliminar parcela' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Alguien cambió esta parcela',
    );
  });
});
