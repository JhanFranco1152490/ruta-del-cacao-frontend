import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { buildBuyerOption, buildFarm, buildSession } from '@/test/factories';
import { buyerOptionsHandler, farmsHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { mockLocation, resetLocation } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { SaleFormScreen } from './sale-form-screen';

const ESPERANZA = buildFarm({ id: 'f1', code: 'F02', name: 'La Esperanza' });
const DIVISO = buildFarm({ id: 'f2', code: 'F03', name: 'El Diviso' });
const RETIRED = buildFarm({
  id: 'f3',
  code: 'F04',
  name: 'El Retiro',
  is_active: false,
});

const SELLER = [PERMISSIONS.SALES_VIEW, PERMISSIONS.SALES_ADD];

let userId: string;
let buyerRequests: URLSearchParams[];

afterEach(() => vi.restoreAllMocks());

beforeEach(() => {
  userId = `sale-form-${crypto.randomUUID()}`;
  buyerRequests = [];
  resetLocation();
  mockLocation.path = '/ventas/registrar';
  server.use(
    farmsHandler([ESPERANZA, DIVISO, RETIRED]),
    buyerOptionsHandler(
      [
        buildBuyerOption(),
        buildBuyerOption({
          id: 'b2',
          name: 'Cooperativa Cacaotera del Catatumbo',
          buyer_type: 'cooperative',
        }),
      ],
      buyerRequests,
    ),
  );
});

function renderScreen({
  permissions = SELLER,
  superuser = false,
  search = '',
}: { permissions?: string[]; superuser?: boolean; search?: string } = {}) {
  mockLocation.search = search;
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions, is_superuser: superuser }),
  );
  return renderWithProviders(<SaleFormScreen />, { queryClient });
}

describe('SaleFormScreen', () => {
  it('asks for the farm, the buyer, the date and the notes', async () => {
    renderScreen();

    expect(
      await screen.findByRole('heading', { name: 'Registrar venta' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('combobox', { name: 'Finca' })).toHaveValue(
      '',
    );
    expect(screen.getByRole('combobox', { name: 'Comprador' })).toBeEnabled();
    expect(screen.getByLabelText('Fecha de la venta')).toHaveValue(
      new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(
        new Date(),
      ),
    );
    expect(screen.getByLabelText('Observaciones')).toHaveValue('');
  });

  it('offers only the active farms', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(await screen.findByRole('combobox', { name: 'Finca' }));

    expect(
      await screen.findByRole('option', { name: /La Esperanza/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /El Diviso/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: /El Retiro/ }),
    ).not.toBeInTheDocument();
  });

  it('opens on the farm of the list', async () => {
    renderScreen({ search: '?finca=f2' });

    expect(await screen.findByRole('combobox', { name: 'Finca' })).toHaveValue(
      'F03 · El Diviso',
    );
  });

  it('shows the only farm without asking for it', async () => {
    server.use(farmsHandler([ESPERANZA]));
    renderScreen();

    expect(await screen.findByText('F02 · La Esperanza')).toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: 'Finca' }),
    ).not.toBeInTheDocument();
  });

  it('offers the active buyers with their type', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(
      await screen.findByRole('combobox', { name: 'Comprador' }),
    );

    expect(
      await screen.findByRole('option', {
        name: /Chocolates del Oriente S\.A\.S\..*Industria chocolatera/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /Cooperativa o asociación/ }),
    ).toBeInTheDocument();
  });

  it('says there are no active buyers, and links to register one', async () => {
    server.use(buyerOptionsHandler([]));
    renderScreen({
      permissions: [...SELLER, PERMISSIONS.BUYERS_ADD],
    });

    expect(
      await screen.findByText(/Aún no tienes compradores activos\./),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Registrar comprador' }),
    ).toHaveAttribute('href', '/compradores');
    expect(screen.getByRole('combobox', { name: 'Comprador' })).toBeDisabled();
  });

  it('does not link to register a buyer without that permission', async () => {
    server.use(buyerOptionsHandler([]));
    renderScreen();

    await screen.findByText(/Aún no tienes compradores activos\./);
    expect(
      screen.queryByRole('link', { name: 'Registrar comprador' }),
    ).not.toBeInTheDocument();
  });

  it('cancels back to where it was opened from', async () => {
    renderScreen({
      search: `?origen=${encodeURIComponent('/ventas?mes=2026-10')}`,
    });

    expect(
      await screen.findByRole('link', { name: 'Cancelar' }),
    ).toHaveAttribute('href', '/ventas?mes=2026-10');
  });

  it('needs a connection to register a sale', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderScreen();

    expect(
      await screen.findByRole('heading', {
        name: 'Necesitas conexión para registrar o cambiar ventas.',
      }),
    ).toBeInTheDocument();
  });

  it('asks the technical account for the producer before the buyers', async () => {
    renderScreen({ superuser: true });

    expect(
      await screen.findByRole('combobox', { name: 'Productor' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Comprador' })).toBeDisabled();
    await waitFor(() => expect(buyerRequests).toEqual([]));
  });
});
