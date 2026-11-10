import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { PERMISSIONS } from '@/lib/permissions';
import { buildSale, buildSession } from '@/test/factories';
import { apiUrl, saleHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { mockLocation, resetLocation } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { saleDetailCacheKey } from '../queries';
import { SaleDetailScreen } from './sale-detail-screen';

const ORIGIN = '/ventas?mes=2026-11';
const VIEW = [PERMISSIONS.SALES_VIEW];
const WITH_LINKS = [...VIEW, PERMISSIONS.LOTS_VIEW, PERMISSIONS.BUYERS_VIEW];

let userId: string;

afterEach(() => vi.restoreAllMocks());

beforeEach(() => {
  userId = `sale-detail-${crypto.randomUUID()}`;
  resetLocation();
  mockLocation.path = '/ventas/detalle';
  mockLocation.search = `?id=s1&origen=${encodeURIComponent(ORIGIN)}`;
  server.use(saleHandler(buildSale()));
});

function renderScreen(permissions = WITH_LINKS) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions }),
  );
  return renderWithProviders(<SaleDetailScreen />, { queryClient });
}

const sectionOf = (name: string) => screen.findByRole('region', { name });

describe('SaleDetailScreen', () => {
  it('shows the number, the status, the date and the buyer of the sale', async () => {
    renderScreen();

    const hero = await screen.findByRole('region', { name: 'Venta V-0001' });
    expect(hero).toHaveTextContent('Registrada');
    expect(hero).toHaveTextContent(
      '20 de noviembre de 2026 · Chocolates del Oriente S.A.S.',
    );
  });

  it('shows its value and the kilos of each grade', async () => {
    renderScreen();

    const figures = await sectionOf('Cifras de la venta');
    expect(figures).toHaveTextContent('Valor total$ 3.375.000');
    expect(figures).toHaveTextContent('Kg de G1150,0');
    expect(figures).toHaveTextContent('Kg de G240,0');
    // Las dos líneas son del mismo lote.
    expect(figures).toHaveTextContent('Lotes1en 2 líneas');
  });

  it('lists each line with its price and subtotal, and the total', async () => {
    renderScreen();

    const table = within(await sectionOf('Líneas')).getByRole('table');
    const [, g1, g2, total] = within(table).getAllByRole('row');
    expect(g1).toHaveTextContent('G1');
    expect(g1).toHaveTextContent('150,0 kg');
    expect(g1).toHaveTextContent('$ 18.500');
    expect(g1).toHaveTextContent('$ 2.775.000');
    expect(g2).toHaveTextContent('$ 600.000');
    expect(total).toHaveTextContent('Valor total$ 3.375.000');
    expect(
      within(g1).getByRole('link', { name: '000123-F02-P05-261014-1' }),
    ).toHaveAttribute('href', '/lotes/detalle?id=l1');
  });

  it('links to the lot and the buyer only with their permissions', async () => {
    renderScreen(VIEW);

    const lines = await sectionOf('Líneas');
    expect(within(lines).queryByRole('link')).not.toBeInTheDocument();
    expect(
      within(await sectionOf('Datos')).queryByRole('link'),
    ).not.toBeInTheDocument();
  });

  it('shows the farm, the buyer and who registered it', async () => {
    renderScreen();

    const facts = await sectionOf('Datos');
    expect(facts).toHaveTextContent('F02 · La Esperanza');
    expect(facts).toHaveTextContent('Industria chocolatera');
    expect(facts).toHaveTextContent('Por Persona Comercializadora el');
    expect(
      within(facts).getByRole('link', {
        name: 'Chocolates del Oriente S.A.S.',
      }),
    ).toHaveAttribute('href', '/compradores?comprador=b1');
  });

  it('says who voided it, when and why', async () => {
    server.use(
      saleHandler(
        buildSale({
          status: 'voided',
          voided: {
            voided_at: '2026-11-21T14:00:00Z',
            voided_by: { id: 'u2', full_name: 'Persona Productora' },
            reason: 'El comprador no recogió el cacao.',
          },
        }),
      ),
    );
    renderScreen();

    expect(
      await screen.findByRole('region', { name: 'Venta V-0001' }),
    ).toHaveTextContent('Anulada');
    const facts = await sectionOf('Datos');
    expect(facts).toHaveTextContent('Por Persona Productora el');
    expect(facts).toHaveTextContent('El comprador no recogió el cacao.');
  });

  it('goes back to the list it came from', async () => {
    renderScreen();

    expect(await screen.findByRole('link', { name: 'Volver' })).toHaveAttribute(
      'href',
      ORIGIN,
    );
  });

  it('says when the sale does not exist', async () => {
    server.use(
      saleHandler(
        HttpResponse.json(
          { detail: 'No encontrado.', code: 'not_found', fields: {} },
          { status: 404 },
        ),
      ),
    );
    renderScreen();

    expect(
      await screen.findByRole('heading', { name: 'Esta venta no existe.' }),
    ).toBeInTheDocument();
  });

  it('shows the copy without a connection, without links', async () => {
    await getOfflineDb(userId).cache.put({
      key: saleDetailCacheKey('s1'),
      value: buildSale(),
      fetchedAt: 1_760_000_000_000,
    });
    server.use(http.get(apiUrl('/api/sales/:id'), () => HttpResponse.error()));
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderScreen();

    expect(
      await screen.findByText(/Sin conexión: estás viendo la copia del/),
    ).toBeInTheDocument();
    expect(
      within(await sectionOf('Líneas')).queryByRole('link'),
    ).not.toBeInTheDocument();
  });

  it('asks for a connection when the sale was never opened', async () => {
    server.use(http.get(apiUrl('/api/sales/:id'), () => HttpResponse.error()));
    renderScreen();

    expect(
      await screen.findByRole('heading', {
        name: 'Necesitas conexión para ver esta venta.',
      }),
    ).toBeInTheDocument();
  });

  describe('the receipt', () => {
    const print = () =>
      fireEvent.click(
        screen.getByRole('button', { name: 'Imprimir comprobante' }),
      );
    const receipt = () =>
      screen.getByRole('article', { name: 'Comprobante de la venta V-0001' });

    it('is drawn only when printing, with what the sale registered', async () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      renderScreen();
      await sectionOf('Líneas');
      expect(
        screen.queryByRole('article', { name: /Comprobante/ }),
      ).not.toBeInTheDocument();

      print();

      expect(printSpy).toHaveBeenCalledTimes(1);
      const document = receipt();
      expect(document).toHaveTextContent('Comprobante de venta');
      expect(document).toHaveTextContent('V-0001');
      expect(document).toHaveTextContent('F02 · La Esperanza');
      expect(document).toHaveTextContent('Chocolates del Oriente S.A.S.');
      expect(document).toHaveTextContent('000123-F02-P05-261014-1');
      expect(document).toHaveTextContent('150,0 kg');
      expect(document).toHaveTextContent('$ 3.375.000');
      expect(document).toHaveTextContent('G1 150,0 kg · G2 40,0 kg');
    });

    it('says it is not an electronic invoice', async () => {
      vi.spyOn(window, 'print').mockImplementation(() => {});
      renderScreen();
      await sectionOf('Líneas');

      print();

      expect(receipt()).toHaveTextContent('No es una factura electrónica');
    });

    it('marks a voided sale and says why', async () => {
      vi.spyOn(window, 'print').mockImplementation(() => {});
      server.use(
        saleHandler(
          buildSale({
            status: 'voided',
            voided: {
              voided_at: '2026-11-21T14:00:00Z',
              voided_by: { id: 'u2', full_name: 'Persona Productora' },
              reason: 'El comprador no recogió el cacao.',
            },
          }),
        ),
      );
      renderScreen();
      await sectionOf('Líneas');

      print();

      expect(receipt()).toHaveTextContent('Venta anulada');
      expect(receipt()).toHaveTextContent('El comprador no recogió el cacao.');
    });

    it('stops drawing it when the printing is over', async () => {
      vi.spyOn(window, 'print').mockImplementation(() => {});
      renderScreen();
      await sectionOf('Líneas');
      print();
      expect(receipt()).toBeInTheDocument();

      fireEvent(window, new Event('afterprint'));

      expect(
        screen.queryByRole('article', { name: /Comprobante/ }),
      ).not.toBeInTheDocument();
    });

    it('can be printed from the copy without a connection', async () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      await getOfflineDb(userId).cache.put({
        key: saleDetailCacheKey('s1'),
        value: buildSale(),
        fetchedAt: 1_760_000_000_000,
      });
      server.use(
        http.get(apiUrl('/api/sales/:id'), () => HttpResponse.error()),
      );
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      renderScreen();
      await screen.findByText(/Sin conexión: estás viendo la copia del/);

      print();

      expect(printSpy).toHaveBeenCalledTimes(1);
      expect(receipt()).toHaveTextContent('$ 3.375.000');
    });
  });
});
