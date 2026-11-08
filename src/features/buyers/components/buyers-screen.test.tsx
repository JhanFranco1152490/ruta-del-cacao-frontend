import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { OnUrlUpdateFunction } from 'nuqs/adapters/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { PERMISSIONS } from '@/lib/permissions';
import { buildBuyer, buildSession } from '@/test/factories';
import { apiUrl, buyersHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { stubWideScreen } from '@/test/screen-size';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { BuyersScreen } from './buyers-screen';

const buyers = [
  buildBuyer({
    id: 'b1',
    name: 'Chocolates del Oriente S.A.S.',
    identity_document: '900000001',
    buyer_type: 'chocolate_industry',
    contact_name: 'Persona de Ejemplo',
    phone: '3000000001',
    email: 'compras@example.com',
  }),
  buildBuyer({
    id: 'b2',
    name: 'acopio la ceiba',
    document_type: 'CC',
    identity_document: '1000000002',
    buyer_type: 'intermediary',
    contact_name: null,
    phone: '3000000002',
    email: null,
  }),
  buildBuyer({
    id: 'b3',
    name: 'Ábaco Exportaciones',
    identity_document: '900000003',
    buyer_type: 'intermediary',
    has_records: true,
  }),
  buildBuyer({
    id: 'b4',
    name: 'Cooperativa del Valle',
    identity_document: '900000004',
    buyer_type: 'cooperative',
    is_active: false,
  }),
];

const VIEW = PERMISSIONS.BUYERS_VIEW;
const SALES_MANAGER = [VIEW, PERMISSIONS.BUYERS_ADD, PERMISSIONS.BUYERS_CHANGE];
const PRODUCER = [...SALES_MANAGER, PERMISSIONS.BUYERS_DELETE];

let userId: string;
let requests: URLSearchParams[];

beforeEach(() => {
  userId = `buyers-screen-${crypto.randomUUID()}`;
  requests = [];
  server.use(buyersHandler(buyers, requests));
});

afterEach(() => vi.unstubAllGlobals());

function renderScreen({
  searchParams = '',
  permissions = SALES_MANAGER,
  superuser = false,
  onUrlUpdate,
}: {
  searchParams?: string;
  permissions?: string[];
  superuser?: boolean;
  onUrlUpdate?: OnUrlUpdateFunction;
} = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, is_superuser: superuser, permissions }),
  );
  return renderWithProviders(<BuyersScreen />, {
    queryClient,
    searchParams,
    onUrlUpdate,
  });
}

const table = () => screen.findByRole('table', { name: 'Compradores' });
const rows = () =>
  within(screen.getByRole('table', { name: 'Compradores' }))
    .getAllByRole('row')
    .slice(1);
const names = () =>
  rows().map(
    (row) => within(row).getAllByRole('cell')[0].firstChild?.textContent,
  );

describe('BuyersScreen', () => {
  it('lists the active buyers by name, without case or accents', async () => {
    renderScreen();

    await table();
    expect(names()).toEqual([
      'Ábaco Exportaciones',
      'acopio la ceiba',
      'Chocolates del Oriente S.A.S.',
    ]);
    expect(
      screen.getByText('3 compradores · ordenados por nombre'),
    ).toBeInTheDocument();
  });

  it('shows the document, the buyer type, the contact and the status of each one', async () => {
    renderScreen();

    await table();
    const oriente = rows()[2];
    expect(oriente).toHaveTextContent('NIT 900000001');
    expect(oriente).toHaveTextContent('Industria chocolatera');
    expect(oriente).toHaveTextContent('Persona de Ejemplo');
    expect(oriente).toHaveTextContent('3000000001 · compras@example.com');
    expect(oriente).toHaveTextContent('Activo');
    expect(rows()[1]).toHaveTextContent('CC 1000000002');
  });

  it('summarizes the active and inactive buyers and the most frequent type', async () => {
    renderScreen();

    const summary = await screen.findByRole('region', {
      name: 'Resumen de compradores',
    });
    expect(summary).toHaveTextContent('Compradores activos3');
    expect(summary).toHaveTextContent('Inactivos1');
    expect(summary).toHaveTextContent('Intermediario o acopiador');
    expect(summary).toHaveTextContent('2 compradores');
  });

  it('searches by name, contact or document while typing, and keeps it in the URL', async () => {
    const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
    renderScreen({ onUrlUpdate });

    await table();
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Buscar comprador' }),
      'oriente sas',
    );

    await waitFor(() =>
      expect(names()).toEqual(['Chocolates del Oriente S.A.S.']),
    );
    expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe(
      '?buscar=oriente+sas',
    );
  });

  it('filters by type and shows the inactive ones on request', async () => {
    renderScreen({ searchParams: '?tipo=cooperative&estado=all' });

    await table();
    expect(names()).toEqual(['Cooperativa del Valle']);
    expect(rows()[0]).toHaveTextContent('Inactivo');
  });

  it('says nothing was found and clears the filters', async () => {
    renderScreen({ searchParams: '?buscar=zzz' });

    expect(
      await screen.findByRole('heading', {
        name: 'No se encontraron compradores',
      }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Limpiar filtros' }),
    );

    await table();
    expect(rows()).toHaveLength(3);
  });

  it('invites to register the first buyer when the directory is empty', async () => {
    server.use(buyersHandler([]));
    renderScreen();

    expect(
      await screen.findByRole('heading', {
        name: 'Aún no hay compradores registrados',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Registrar comprador' }),
    ).toHaveLength(2);
  });

  it('gives the sales manager two buttons and no delete', async () => {
    renderScreen();

    await table();
    const oriente = rows()[2];
    expect(
      within(oriente).getByRole('button', {
        name: 'Editar Chocolates del Oriente S.A.S.',
      }),
    ).toBeEnabled();
    expect(
      within(oriente).getByRole('button', {
        name: 'Desactivar Chocolates del Oriente S.A.S.',
      }),
    ).toBeEnabled();
    expect(within(oriente).queryByText('Eliminar')).not.toBeInTheDocument();
  });

  it('gives the producer the three actions in a menu, delete disabled with its reason for a buyer with sales', async () => {
    renderScreen({ permissions: PRODUCER });

    await table();
    await userEvent.click(
      within(rows()[0]).getByRole('button', {
        name: 'Más acciones de Ábaco Exportaciones',
      }),
    );

    const remove = await screen.findByRole('menuitem', { name: /Eliminar/ });
    expect(remove).toHaveAttribute('aria-disabled', 'true');
    expect(remove).toHaveTextContent(
      'No se puede eliminar: tiene ventas registradas.',
    );
    expect(
      screen.getByRole('menuitem', { name: 'Desactivar' }),
    ).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('offers nothing to whoever only reads', async () => {
    renderScreen({ permissions: [VIEW] });

    await table();
    expect(
      screen.queryByRole('button', { name: 'Registrar comprador' }),
    ).not.toBeInTheDocument();
    expect(
      within(rows()[0]).queryAllByRole('button', {
        name: /Editar|Más acciones/,
      }),
    ).toHaveLength(0);
  });

  it('highlights the buyer of the address on a wide screen, without a sheet', async () => {
    stubWideScreen();
    renderScreen({ searchParams: '?comprador=b2' });

    await table();
    expect(rows()[1]).toHaveAttribute('data-state', 'selected');
    expect(rows()[0]).not.toHaveAttribute('data-state');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  describe('on a phone', () => {
    it('opens the sheet of a buyer touching its card, with its data', async () => {
      const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
      renderScreen({ onUrlUpdate });

      await userEvent.click(
        await screen.findByRole('button', {
          name: 'Ver Chocolates del Oriente S.A.S.',
        }),
      );

      const sheet = await screen.findByRole('dialog', {
        name: 'Chocolates del Oriente S.A.S.',
      });
      expect(sheet).toHaveTextContent('NIT 900000001');
      expect(sheet).toHaveTextContent('Industria chocolatera');
      expect(sheet).toHaveTextContent('Persona de Ejemplo');
      expect(sheet).toHaveTextContent('3000000001 · compras@example.com');
      expect(sheet).toHaveTextContent('Activo');
      expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe('?comprador=b1');
    });

    it('opens the buyer of the address even when the filters hide it', async () => {
      renderScreen({ searchParams: '?comprador=b4' });

      expect(
        await screen.findByRole('dialog', { name: 'Cooperativa del Valle' }),
      ).toHaveTextContent('Inactivo');
    });

    it('shows the actions in the sheet, delete disabled with its reason', async () => {
      renderScreen({ permissions: PRODUCER, searchParams: '?comprador=b3' });

      const sheet = await screen.findByRole('dialog', {
        name: 'Ábaco Exportaciones',
      });
      expect(
        within(sheet).getByRole('button', { name: 'Editar' }),
      ).toBeEnabled();
      expect(
        within(sheet).getByRole('button', { name: 'Desactivar' }),
      ).toBeEnabled();
      expect(
        within(sheet).getByRole('button', { name: 'Eliminar' }),
      ).toBeDisabled();
      expect(sheet).toHaveTextContent(
        'No se puede eliminar: tiene ventas registradas.',
      );
    });

    it('closes the sheet and forgets the buyer in the URL', async () => {
      const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
      renderScreen({ searchParams: '?comprador=b1', onUrlUpdate });

      await screen.findByRole('dialog', {
        name: 'Chocolates del Oriente S.A.S.',
      });
      await userEvent.keyboard('{Escape}');

      await waitFor(() =>
        expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe(''),
      );
    });

    it('ignores a buyer of the address that is not in the directory', async () => {
      renderScreen({ searchParams: '?comprador=zzz' });

      await table();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('shows the copy of the device without a connection, with writing disabled', async () => {
    await getOfflineDb(userId).cache.put({
      key: 'buyers',
      value: buyers,
      fetchedAt: 1_700_000_000_000,
    });
    server.use(http.get(apiUrl('/api/buyers'), () => HttpResponse.error()));
    renderScreen();

    await table();
    expect(
      screen.getByText(/Sin conexión: estás viendo la copia del/),
    ).toHaveTextContent('Registrar o cambiar un comprador necesita conexión.');
    expect(
      screen.getByRole('button', { name: 'Registrar comprador' }),
    ).toBeDisabled();
    expect(
      within(rows()[2]).getByRole('button', {
        name: 'Editar Chocolates del Oriente S.A.S.',
      }),
    ).toBeDisabled();
  });

  it('asks for a connection once when there is no copy', async () => {
    server.use(http.get(apiUrl('/api/buyers'), () => HttpResponse.error()));
    renderScreen();

    expect(
      await screen.findByRole('heading', {
        name: 'Necesitas conexión una vez para cargar los compradores.',
      }),
    ).toBeInTheDocument();
  });

  it('offers to retry when the server fails', async () => {
    server.use(
      http.get(apiUrl('/api/buyers'), () =>
        HttpResponse.json(
          { detail: 'Error.', code: 'server_error', fields: {} },
          { status: 500 },
        ),
      ),
    );
    renderScreen();

    expect(
      await screen.findByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument();
  });

  it('shows the technical account every producer, with its column, and asks for the chosen one', async () => {
    renderScreen({ superuser: true, searchParams: '' });

    await table();
    expect(
      screen.getByRole('columnheader', { name: 'Productor' }),
    ).toBeInTheDocument();
    expect(rows()[0]).toHaveTextContent('Productora De Ejemplo · 000123');
    expect(requests[0].toString()).toBe('');
  });

  it('hides the producer column once the technical account chose one', async () => {
    server.use(
      http.get(apiUrl('/api/producers/:id'), () =>
        HttpResponse.json({
          id: 'p1',
          member_code: '000123',
          first_name: 'Productora',
          last_name: 'De Ejemplo',
        }),
      ),
    );
    renderScreen({ superuser: true, searchParams: '?productor=p1' });

    await table();
    expect(requests[0].get('producer')).toBe('p1');
    expect(
      screen.queryByRole('columnheader', { name: 'Productor' }),
    ).not.toBeInTheDocument();
  });
});
