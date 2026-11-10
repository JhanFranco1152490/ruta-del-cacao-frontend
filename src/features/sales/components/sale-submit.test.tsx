import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { MAX_UPLOAD_BYTES } from '@/lib/files/upload-limits';
import { notify } from '@/lib/notify';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildBuyerOption,
  buildFarm,
  buildSale,
  buildSession,
  buildStockRow,
} from '@/test/factories';
import {
  buyerOptionsHandler,
  csrfHandler,
  farmsHandler,
  saleWriteHandler,
  stockListHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { mockLocation, resetLocation, router } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

// En jsdom, `fetch` no envía un `FormData`: la subida del soporte se reemplaza aquí y se prueba de
// verdad en el entorno `node` (`mutations-files.test.ts`).
vi.mock('../invoice-api', () => ({ putInvoice: vi.fn() }));

import { ApiError } from '@/lib/api/errors';

import { putInvoice } from '../invoice-api';
import { SaleFormScreen } from './sale-form-screen';

const ORIGIN = '/ventas?mes=2026-11';
const TODAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota',
}).format(new Date());
const LOT = { id: 'l1', code: '000123-F02-P05-261014-1' };

let bodies: unknown[];

afterEach(() => vi.restoreAllMocks());

beforeEach(() => {
  bodies = [];
  resetLocation();
  mockLocation.path = '/ventas/registrar';
  mockLocation.search = `?origen=${encodeURIComponent(ORIGIN)}`;
  router.replace.mockClear();
  router.push.mockClear();
  vi.spyOn(notify, 'success').mockImplementation(() => '');
  vi.spyOn(notify, 'warning').mockImplementation(() => '');
  vi.mocked(putInvoice).mockReset();
  server.use(
    csrfHandler,
    farmsHandler([buildFarm({ id: 'f1', code: 'F02', name: 'La Esperanza' })]),
    buyerOptionsHandler([buildBuyerOption()]),
    stockListHandler([
      buildStockRow({ lot: LOT, grade: 'g1', quantity_kg: '245.0' }),
      buildStockRow({ lot: LOT, grade: 'g2', quantity_kg: '55.2' }),
    ]),
    saleWriteHandler('create', buildSale(), bodies),
  );
});

// Pega el texto en vez de teclearlo letra por letra: con la suite en paralelo, teclear varios campos
// pasaba del tiempo de espera.
async function typeInto(
  user: ReturnType<typeof userEvent.setup>,
  field: HTMLElement,
  text: string,
) {
  await user.clear(field);
  await user.click(field);
  await user.paste(text);
}

function renderScreen() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: `sale-submit-${crypto.randomUUID()}`,
      permissions: [PERMISSIONS.SALES_VIEW, PERMISSIONS.SALES_ADD],
    }),
  );
  return renderWithProviders(<SaleFormScreen />, { queryClient });
}

type User = ReturnType<typeof userEvent.setup>;

async function fillSale(user: User, { buyer = true } = {}) {
  if (buyer) {
    await user.click(
      await screen.findByRole('combobox', { name: 'Comprador' }),
    );
    await user.click(
      await screen.findByRole('option', { name: /Chocolates del Oriente/ }),
    );
  }
  const line = await screen.findByRole('listitem', { name: 'Línea 1' });
  await user.click(
    within(line).getByRole('combobox', { name: 'Lote y calibre' }),
  );
  await user.click(await screen.findByRole('option', { name: /· G1/ }));
  await typeInto(user, within(line).getByLabelText('Kilos'), '150');
  await typeInto(
    user,
    within(line).getByLabelText('Precio por kilo'),
    '18.500',
  );
  return line;
}

const save = (user: User) =>
  user.click(screen.getByRole('button', { name: 'Guardar venta' }));

const pdf = (size = 300 * 1024) => {
  const file = new File(['%PDF-1.4'], 'factura.pdf', {
    type: 'application/pdf',
  });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('saving a sale', () => {
  // Las que llenan el formulario completo (dos listas, una línea y el envío) llevan 10 s: con la
  // suite en paralelo pasan a veces de los 5 s por defecto.
  it('registers the sale, goes back and announces it', async () => {
    const user = userEvent.setup();
    renderScreen();

    await fillSale(user);
    await save(user);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(ORIGIN));
    expect(bodies).toEqual([
      {
        farm_id: 'f1',
        buyer_id: 'b1',
        sale_date: TODAY,
        notes: '',
        lines: [
          {
            lot_id: 'l1',
            grade: 'g1',
            quantity_kg: '150',
            price_per_kg: 18500,
          },
        ],
      },
    ]);
    expect(notify.success).toHaveBeenCalledWith('Venta V-0001 registrada.');
  }, 10_000);

  it('marks what is missing and sends nothing', async () => {
    const user = userEvent.setup();
    renderScreen();

    await screen.findByRole('listitem', { name: 'Línea 1' });
    await save(user);

    expect(
      await screen.findByText('Complete los datos obligatorios'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Campo obligatorio').length).toBeGreaterThan(2);
    expect(bodies).toEqual([]);
  });

  it('does not send more kilos than are available', async () => {
    const user = userEvent.setup();
    renderScreen();

    const line = await fillSale(user, { buyer: false });
    await user.clear(within(line).getByLabelText('Kilos'));
    await typeInto(user, within(line).getByLabelText('Kilos'), '300');
    await save(user);

    expect(
      await within(line).findByText(
        'La cantidad supera lo disponible (245,0 kg)',
      ),
    ).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('marks the line when someone sold those kilos meanwhile', async () => {
    const user = userEvent.setup();
    server.use(
      saleWriteHandler(
        'create',
        HttpResponse.json(
          {
            detail: 'La cantidad supera lo disponible (95,0 kg)',
            code: 'stock_insufficient',
            fields: {
              lines: ['La cantidad supera lo disponible (95,0 kg)'],
            },
            line: 0,
            available_kg: '95.0',
          },
          { status: 400 },
        ),
      ),
    );
    renderScreen();

    const line = await fillSale(user);
    await save(user);

    expect(
      await within(line).findByText(
        'La cantidad supera lo disponible (95,0 kg)',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('No se registró la venta: revisa lo marcado.'),
    ).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('marks the buyer when it was deactivated meanwhile', async () => {
    const user = userEvent.setup();
    server.use(
      saleWriteHandler(
        'create',
        HttpResponse.json(
          {
            detail: 'El comprador está inactivo.',
            code: 'buyer_inactive',
            fields: { buyer_id: ['El comprador está inactivo.'] },
          },
          { status: 422 },
        ),
      ),
    );
    renderScreen();

    await fillSale(user);
    await save(user);

    expect(
      await screen.findByText('El comprador está inactivo.'),
    ).toBeInTheDocument();
  });

  it('refuses an invoice that is not a PDF, JPG or PNG of up to 5 MB', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderScreen();

    await screen.findByRole('listitem', { name: 'Línea 1' });
    const input = screen.getByLabelText('Archivo del soporte');
    await user.upload(
      input,
      new File(['x'], 'factura.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );
    expect(
      await screen.findByText('Solo se permiten PDF, JPG o PNG de hasta 5 MB.'),
    ).toBeInTheDocument();

    await user.upload(input, pdf(MAX_UPLOAD_BYTES + 1));
    expect(
      screen.getByText('Solo se permiten PDF, JPG o PNG de hasta 5 MB.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('factura.pdf')).not.toBeInTheDocument();
  });

  it('shows the chosen invoice and lets remove it', async () => {
    const user = userEvent.setup();
    renderScreen();

    await screen.findByRole('listitem', { name: 'Línea 1' });
    await user.upload(screen.getByLabelText('Archivo del soporte'), pdf());

    expect(await screen.findByText('factura.pdf')).toBeInTheDocument();
    expect(screen.getByText('300 KB')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Quitar factura.pdf' }),
    );
    expect(screen.queryByText('factura.pdf')).not.toBeInTheDocument();
  });

  it('uploads the invoice right after the sale', async () => {
    const user = userEvent.setup();
    vi.mocked(putInvoice).mockResolvedValue(buildSale({ version: 2 }));
    renderScreen();

    await fillSale(user);
    await user.upload(screen.getByLabelText('Archivo del soporte'), pdf());
    await save(user);

    await waitFor(() =>
      expect(notify.success).toHaveBeenCalledWith('Venta V-0001 registrada.'),
    );
    expect(putInvoice).toHaveBeenCalledWith('s1', expect.any(File));
  }, 10_000);

  it('keeps the sale and warns when the invoice could not be attached', async () => {
    const user = userEvent.setup();
    vi.mocked(putInvoice).mockRejectedValue(
      new ApiError(415, {
        detail: 'Solo se permiten PDF, JPG o PNG.',
        code: 'invoice_format_not_allowed',
        fields: {},
      }),
    );
    renderScreen();

    await fillSale(user);
    await user.upload(screen.getByLabelText('Archivo del soporte'), pdf());
    await save(user);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(ORIGIN));
    expect(notify.warning).toHaveBeenCalledWith(
      'Venta V-0001 registrada, pero no se pudo adjuntar el soporte. Adjúntalo desde la venta.',
      expect.objectContaining({
        action: expect.objectContaining({ label: 'Ver venta' }),
      }),
    );
    expect(notify.success).not.toHaveBeenCalled();
  }, 10_000);
});
