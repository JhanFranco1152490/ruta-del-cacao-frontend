import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    ]);
    expect(
      screen.getByRole('region', { name: 'Estado actual' }),
    ).toHaveTextContent(
      'Estado actual: En bodega · 12,5 kg de G1 y 7,5 kg de G2 disponibles · 20,0 kg vendidos',
    );
  });

  it('marks the stage being read as the page scrolls', async () => {
    server.use(lotHistoryHandler(buildLotHistory()));
    renderScreen();
    await screen.findByRole('listitem', { name: 'Venta V-0012' });

    // Las primeras etapas ya subieron por encima de la línea de lectura; la tercera aún no.
    const tops: Record<string, number> = {
      'etapa-0': -900,
      'etapa-1': -500,
      'etapa-2': 400,
    };
    for (const [id, top] of Object.entries(tops)) {
      vi.spyOn(
        document.getElementById(id) as HTMLElement,
        'getBoundingClientRect',
      ).mockReturnValue({ top } as DOMRect);
    }
    for (let index = 3; index < 10; index += 1) {
      vi.spyOn(
        document.getElementById(`etapa-${index}`) as HTMLElement,
        'getBoundingClientRect',
      ).mockReturnValue({ top: 1200 } as DOMRect);
    }
    fireEvent.scroll(window);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Lote conformado' }),
      ).toHaveAttribute('aria-current', 'step'),
    );
    expect(
      screen.getByRole('button', { name: 'Venta V-0012' }),
    ).not.toHaveAttribute('aria-current');
  });

  it('keeps the stage that was clicked marked until the page is scrolled again', async () => {
    server.use(lotHistoryHandler(buildLotHistory()));
    renderScreen();
    await screen.findByRole('listitem', { name: 'Venta V-0012' });
    // jsdom no desplaza; el clic llama a `scrollIntoView` de la entrada.
    Element.prototype.scrollIntoView = vi.fn();
    // Con estas posiciones, leyendo la página se marcaría «Lote conformado».
    for (let index = 0; index < 10; index += 1) {
      vi.spyOn(
        document.getElementById(`etapa-${index}`) as HTMLElement,
        'getBoundingClientRect',
      ).mockReturnValue({
        top: index < 2 ? -300 + index * 100 : 900,
      } as DOMRect);
    }
    const sale = screen.getByRole('button', { name: 'Venta V-0012' });

    await userEvent.click(sale);
    expect(sale).toHaveAttribute('aria-current', 'step');

    // El desplazamiento que provoca el propio clic no cambia lo marcado.
    fireEvent.scroll(window);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(sale).toHaveAttribute('aria-current', 'step');

    // Al desplazar la persona, vuelve a marcarse la que se lee.
    fireEvent.wheel(window);
    fireEvent.scroll(window);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Lote conformado' }),
      ).toHaveAttribute('aria-current', 'step'),
    );
    expect(sale).not.toHaveAttribute('aria-current');
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
      await screen.findByRole('region', { name: 'Estado actual' }),
    ).toHaveTextContent('Estado actual: En fermentación');
    expect(stages()).toEqual(['Cosecha', 'Lote conformado', 'Fermentación']);
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
      screen.getByRole('region', { name: 'Estado actual' }),
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
