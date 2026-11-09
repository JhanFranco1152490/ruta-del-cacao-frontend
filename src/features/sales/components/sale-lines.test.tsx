import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildBuyerOption,
  buildFarm,
  buildSession,
  buildStockRow,
} from '@/test/factories';
import {
  buyerOptionsHandler,
  farmsHandler,
  stockListHandler,
} from '@/test/handlers';
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
const LOT = { id: 'l1', code: '000123-F02-P05-261014-1' };
const G1 = buildStockRow({ lot: LOT, grade: 'g1', quantity_kg: '245.0' });
const G2 = buildStockRow({ lot: LOT, grade: 'g2', quantity_kg: '55.2' });

let stockRequests: URLSearchParams[];

afterEach(() => vi.restoreAllMocks());

beforeEach(() => {
  stockRequests = [];
  resetLocation();
  mockLocation.path = '/ventas/registrar';
  mockLocation.search = '?finca=f1';
  server.use(
    farmsHandler([ESPERANZA, DIVISO]),
    buyerOptionsHandler([buildBuyerOption()]),
    stockListHandler([G1, G2], stockRequests),
  );
});

function renderScreen() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: `sale-lines-${crypto.randomUUID()}`,
      permissions: [PERMISSIONS.SALES_VIEW, PERMISSIONS.SALES_ADD],
    }),
  );
  return renderWithProviders(<SaleFormScreen />, { queryClient });
}

const lineOf = (position: number) =>
  screen.findByRole('listitem', { name: `Línea ${position}` });

async function chooseStock(
  user: ReturnType<typeof userEvent.setup>,
  line: HTMLElement,
  name: RegExp,
) {
  await user.click(
    within(line).getByRole('combobox', { name: 'Lote y calibre' }),
  );
  await user.click(await screen.findByRole('option', { name }));
}

describe('the lines of a sale', () => {
  it('asks for the stock of the chosen farm, all of it', async () => {
    renderScreen();

    await lineOf(1);
    expect(stockRequests[0].toString()).toBe('farm=f1&page_size=100');
  });

  it('offers each lot and grade with what is available', async () => {
    const user = userEvent.setup();
    renderScreen();

    const line = await lineOf(1);
    await user.click(
      within(line).getByRole('combobox', { name: 'Lote y calibre' }),
    );

    expect(
      await screen.findByRole('option', {
        name: /000123-F02-P05-261014-1 · G1.*Disponible: 245,0 kg/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /G2.*Disponible: 55,2 kg/ }),
    ).toBeInTheDocument();
  });

  it('works out the subtotal and the total while typing', async () => {
    const user = userEvent.setup();
    renderScreen();

    const first = await lineOf(1);
    await chooseStock(user, first, /· G1/);
    await user.type(within(first).getByLabelText('Kilos'), '12,5');
    await user.type(within(first).getByLabelText('Precio por kilo'), '17999');

    expect(
      within(first).getByRole('status', { name: 'Subtotal de la línea 1' }),
    ).toHaveTextContent('$ 224.988');
    expect(screen.getByText(/Valor total:/)).toHaveTextContent(
      'Valor total: $ 224.988',
    );
    expect(screen.getByText(/G1 12,5 kg · G2 0,0 kg/)).toBeInTheDocument();
  });

  it('does not offer a lot and grade already in another line', async () => {
    const user = userEvent.setup();
    renderScreen();

    await chooseStock(user, await lineOf(1), /· G1/);
    await user.click(screen.getByRole('button', { name: 'Agregar línea' }));
    const second = await lineOf(2);
    await user.click(
      within(second).getByRole('combobox', { name: 'Lote y calibre' }),
    );

    expect(
      await screen.findByRole('option', { name: /· G2/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: /· G1/ }),
    ).not.toBeInTheDocument();
  });

  it('adds no more lines than there is stock', async () => {
    const user = userEvent.setup();
    renderScreen();

    await lineOf(1);
    await user.click(screen.getByRole('button', { name: 'Agregar línea' }));

    expect(
      screen.getByRole('button', { name: 'Agregar línea' }),
    ).toBeDisabled();
  });

  it('removes a line and its amount', async () => {
    const user = userEvent.setup();
    renderScreen();

    const first = await lineOf(1);
    await chooseStock(user, first, /· G1/);
    await user.type(within(first).getByLabelText('Kilos'), '10');
    await user.type(within(first).getByLabelText('Precio por kilo'), '18500');
    await user.click(
      within(first).getByRole('button', { name: 'Quitar la línea 1' }),
    );

    expect(
      screen.queryByRole('listitem', { name: 'Línea 1' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Valor total:/)).toHaveTextContent(
      'Valor total: $ 0',
    );
  });

  it('says when the farm has nothing in the warehouse', async () => {
    server.use(stockListHandler([]));
    renderScreen();

    expect(
      await screen.findByText(
        'Esta finca no tiene cacao en bodega para vender.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Agregar línea' }),
    ).not.toBeInTheDocument();
  });

  it('asks before changing the farm with lines written, and clears them', async () => {
    const user = userEvent.setup();
    renderScreen();

    const first = await lineOf(1);
    await user.type(within(first).getByLabelText('Kilos'), '10');
    await user.click(screen.getByRole('combobox', { name: 'Finca' }));
    await user.click(await screen.findByRole('option', { name: /El Diviso/ }));

    const dialog = await screen.findByRole('dialog', {
      name: '¿Cambiar de finca? Se quitarán las líneas.',
    });
    await user.click(
      within(dialog).getByRole('button', { name: 'Cambiar de finca' }),
    );

    await waitFor(() => expect(stockRequests.at(-1)?.get('farm')).toBe('f2'));
    expect(within(await lineOf(1)).getByLabelText('Kilos')).toHaveValue('');
  });

  it('keeps the farm and the lines when the change is cancelled', async () => {
    const user = userEvent.setup();
    renderScreen();

    const first = await lineOf(1);
    await user.type(within(first).getByLabelText('Kilos'), '10');
    await user.click(screen.getByRole('combobox', { name: 'Finca' }));
    await user.click(await screen.findByRole('option', { name: /El Diviso/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('combobox', { name: 'Finca' })).toHaveValue(
      'F02 · La Esperanza',
    );
    expect(within(first).getByLabelText('Kilos')).toHaveValue('10');
  });
});
