import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { notify } from '@/lib/notify';
import { PERMISSIONS } from '@/lib/permissions';
import { buildSale, buildSession } from '@/test/factories';
import { csrfHandler, saleHandler, saleWriteHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { mockLocation, resetLocation } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { SaleDetailScreen } from './sale-detail-screen';

const SALE = buildSale({ version: 3 });
const VOIDED = buildSale({
  status: 'voided',
  version: 4,
  voided: {
    voided_at: '2026-11-21T14:00:00Z',
    voided_by: { id: 'u1', full_name: 'Persona Comercializadora' },
    reason: 'El comprador no recogió el cacao.',
  },
});
const SELLER = [
  PERMISSIONS.SALES_VIEW,
  PERMISSIONS.SALES_ADD,
  PERMISSIONS.SALES_VOID,
];

let bodies: unknown[];

afterEach(() => vi.restoreAllMocks());

beforeEach(() => {
  bodies = [];
  resetLocation();
  mockLocation.path = '/ventas/detalle';
  mockLocation.search = '?id=s1';
  vi.spyOn(notify, 'success').mockImplementation(() => '');
  vi.spyOn(notify, 'warning').mockImplementation(() => '');
  server.use(
    csrfHandler,
    saleHandler(SALE),
    saleWriteHandler('void', VOIDED, bodies),
  );
});

function renderScreen(permissions = SELLER) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: `void-sale-${crypto.randomUUID()}`, permissions }),
  );
  return renderWithProviders(<SaleDetailScreen />, { queryClient });
}

async function openVoid(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Anular venta' }));
  return screen.findByRole('dialog', { name: '¿Anular la venta V-0001?' });
}

describe('voiding a sale', () => {
  it('says how many kilos go back to the warehouse', async () => {
    const user = userEvent.setup();
    renderScreen();

    const dialog = await openVoid(user);

    expect(dialog).toHaveTextContent(
      'Los 190,0 kg vuelven a las existencias de bodega. La venta queda en el historial como anulada.',
    );
  });

  it('voids the sale with its version and reason, and announces it', async () => {
    const user = userEvent.setup();
    renderScreen();

    const dialog = await openVoid(user);
    await user.click(within(dialog).getByLabelText('Motivo'));
    await user.paste('El comprador no recogió el cacao.');
    await user.click(
      within(dialog).getByRole('button', { name: 'Anular venta' }),
    );

    await waitFor(() =>
      expect(notify.success).toHaveBeenCalledWith('Venta V-0001 anulada.'),
    );
    expect(bodies).toEqual([
      { expected_version: 3, reason: 'El comprador no recogió el cacao.' },
    ]);
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('asks for the reason and sends nothing without it', async () => {
    const user = userEvent.setup();
    renderScreen();

    const dialog = await openVoid(user);
    await user.click(
      within(dialog).getByRole('button', { name: 'Anular venta' }),
    );

    expect(
      await within(dialog).findByText('Campo obligatorio'),
    ).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('warns and closes when the sale was already voided', async () => {
    const user = userEvent.setup();
    server.use(
      saleWriteHandler(
        'void',
        HttpResponse.json(
          {
            detail: 'La venta ya está anulada.',
            code: 'sale_voided',
            fields: {},
          },
          { status: 409 },
        ),
      ),
    );
    renderScreen();

    const dialog = await openVoid(user);
    await user.click(within(dialog).getByLabelText('Motivo'));
    await user.paste('Error de digitación.');
    await user.click(
      within(dialog).getByRole('button', { name: 'Anular venta' }),
    );

    await waitFor(() =>
      expect(notify.warning).toHaveBeenCalledWith('La venta ya está anulada.'),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('keeps the dialog open when someone else changed the sale', async () => {
    const user = userEvent.setup();
    server.use(
      saleWriteHandler(
        'void',
        HttpResponse.json(
          {
            detail:
              'Otra persona cambió esta venta. Revisa los datos actuales.',
            code: 'stale_version',
            fields: {},
            current: buildSale({ version: 4 }),
          },
          { status: 409 },
        ),
      ),
    );
    renderScreen();

    const dialog = await openVoid(user);
    await user.click(within(dialog).getByLabelText('Motivo'));
    await user.paste('Error de digitación.');
    await user.click(
      within(dialog).getByRole('button', { name: 'Anular venta' }),
    );

    expect(
      await within(dialog).findByText(
        'Otra persona cambió esta venta. Revisa los datos actuales.',
      ),
    ).toBeInTheDocument();
  });

  it('is not offered without permission, nor on a voided sale', async () => {
    const consultor = renderScreen([
      PERMISSIONS.SALES_VIEW,
      PERMISSIONS.SALES_ADD,
    ]);
    await screen.findByRole('link', { name: 'Volver' });
    expect(
      screen.queryByRole('button', { name: 'Anular venta' }),
    ).not.toBeInTheDocument();
    consultor.unmount();

    server.use(saleHandler(VOIDED));
    renderScreen();
    await screen.findByRole('link', { name: 'Volver' });
    expect(
      screen.queryByRole('button', { name: 'Anular venta' }),
    ).not.toBeInTheDocument();
  });

  it('needs a connection to void', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderScreen();

    expect(
      await screen.findByRole('button', { name: 'Anular venta' }),
    ).toBeDisabled();
  });
});
