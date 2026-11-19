import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { apiError, buildSession } from '@/test/factories';
import { apiUrl, lotHistoryHandler } from '@/test/handlers';
import {
  buildHistoryStage,
  buildLotHistory,
} from '@/test/lot-history-factories';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { mockLocation, resetLocation } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { LotHistoryScreen } from './lot-history-screen';

function renderScreen(
  props: Partial<Parameters<typeof LotHistoryScreen>[0]> = {},
) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ permissions: [PERMISSIONS.LOTS_VIEW] }),
  );
  renderWithProviders(<LotHistoryScreen lotId="l1" {...props} />, {
    queryClient,
  });
}

const stages = () =>
  within(screen.getByRole('list', { name: 'Etapas del lote' }))
    .getAllByRole('listitem')
    .filter((item) => item.hasAttribute('aria-label'))
    .map((item) => item.getAttribute('aria-label'));

beforeEach(() => {
  resetLocation();
  mockLocation.path = '/lotes/historia';
  mockLocation.search = 'id=l1';
});

describe('LotHistoryScreen', () => {
  it('tells the whole story of a sold lot, in the order the server gives', async () => {
    server.use(lotHistoryHandler(buildLotHistory()));
    renderScreen();

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Historia del lote 000123-F02-P05-260314-1',
      }),
    ).toBeVisible();
    const origin = screen.getByRole('region', { name: 'Origen del lote' });
    expect(origin).toHaveTextContent('F02 · La Esperanza');
    expect(origin).toHaveTextContent('Arboledas');
    expect(origin).toHaveTextContent('P05 · Lote del río');
    expect(origin).toHaveTextContent('14 de marzo de 2026');
    expect(origin).toHaveTextContent('120,0 kg');
    expect(stages()).toEqual([
      'Cosecha',
      'Lote conformado',
      'Fermentación',
      'Secado',
      'Evaluación de calidad',
      'Clasificación',
      'Ingreso a bodega',
      'Cambio de lugar',
      'Salida de bodega: Muestra',
      'Venta V-0012',
      'Estado actual',
    ]);
    expect(
      screen.getByRole('listitem', { name: 'Estado actual' }),
    ).toHaveTextContent(
      'Estado actual: En bodega · 12,5 kg de G1 y 7,5 kg de G2 disponibles · 20,0 kg vendidos',
    );
  });

  it('shows a lot still in process up to today, with its current stage', async () => {
    server.use(
      lotHistoryHandler(
        buildLotHistory({
          lot: { ...buildLotHistory().lot, status: 'fermenting' },
          stages: [
            buildHistoryStage('harvest'),
            buildHistoryStage('lot_created'),
            buildHistoryStage('fermentation', { ended_at: null, days: 2 }),
          ],
          current: {
            status: 'fermenting',
            g1_available_kg: null,
            g2_available_kg: null,
            sold_kg: null,
          },
        }),
      ),
    );
    renderScreen();

    expect(
      await screen.findByRole('listitem', { name: 'Estado actual' }),
    ).toHaveTextContent('Estado actual: En fermentación');
    expect(stages()).toEqual([
      'Cosecha',
      'Lote conformado',
      'Fermentación',
      'Estado actual',
    ]);
    expect(
      screen.getByRole('listitem', { name: 'Fermentación' }),
    ).toHaveTextContent('en curso');
  });

  it('shows a fully discarded lot ending in its discard', async () => {
    server.use(
      lotHistoryHandler(
        buildLotHistory({
          stages: [
            buildHistoryStage('harvest'),
            buildHistoryStage('lot_created'),
            buildHistoryStage('evaluation'),
            buildHistoryStage('discard'),
          ],
          current: {
            status: 'discarded',
            g1_available_kg: null,
            g2_available_kg: null,
            sold_kg: null,
          },
        }),
      ),
    );
    renderScreen();

    expect(
      await screen.findByText('Lote descartado: Moho · 45,0 kg'),
    ).toBeVisible();
    expect(
      screen.getByRole('listitem', { name: 'Estado actual' }),
    ).toHaveTextContent('Estado actual: Descartado');
  });

  it('puts the links of the origin under the harvest', async () => {
    server.use(lotHistoryHandler(buildLotHistory()));
    renderScreen({
      originLinks: ({ origin }) => ({
        harvest: `/cosechas/detalle?id=${origin.harvest.id}`,
        plotHealth: `/sanidad?parcela=${origin.plot.id}`,
      }),
    });

    const harvest = await screen.findByRole('listitem', { name: 'Cosecha' });
    expect(
      within(harvest).getByRole('link', { name: 'Ver la cosecha' }),
    ).toHaveAttribute(
      'href',
      expect.stringContaining('/cosechas/detalle?id=h1'),
    );
    expect(
      within(harvest).getByRole('link', { name: 'Sanidad de la parcela' }),
    ).toBeVisible();
    expect(
      within(harvest).queryByRole('link', {
        name: 'Actividades de la parcela',
      }),
    ).not.toBeInTheDocument();
  });

  it('always links to the lot detail and goes back to it without an origin', async () => {
    server.use(lotHistoryHandler(buildLotHistory()));
    renderScreen();

    expect(
      await screen.findByRole('link', { name: 'Ficha del lote' }),
    ).toHaveAttribute('href', expect.stringContaining('/lotes/detalle?id=l1'));
    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute(
      'href',
      '/lotes/detalle?id=l1',
    );
  });

  it('goes back to the screen it was opened from, with its filters', async () => {
    mockLocation.search = `id=l1&origen=${encodeURIComponent('/lotes?finca=f1')}`;
    server.use(lotHistoryHandler(buildLotHistory()));
    renderScreen();

    expect(await screen.findByRole('link', { name: 'Volver' })).toHaveAttribute(
      'href',
      '/lotes?finca=f1',
    );
  });

  it('says the lot was not found, the same for a missing lot and one out of reach', async () => {
    server.use(lotHistoryHandler(apiError(404, 'not_found')));
    renderScreen();

    expect(await screen.findByText('No se encontró el lote.')).toBeVisible();
  });

  it('offers to retry when the history cannot be read', async () => {
    server.use(lotHistoryHandler(apiError(500, 'server_error')));
    renderScreen();

    expect(
      await screen.findByText('No fue posible cargar la historia del lote.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeVisible();
  });

  it('asks for a connection without one', async () => {
    server.use(
      http.get(apiUrl('/api/lots/l1/history'), () => HttpResponse.error()),
    );
    renderScreen();

    expect(
      await screen.findByText('Ver la historia del lote necesita conexión.'),
    ).toBeVisible();
  });
});
