import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { MAX_UPLOAD_BYTES } from '@/lib/files/upload-limits';
import { notify } from '@/lib/notify';
import { PERMISSIONS } from '@/lib/permissions';
import { buildSale, buildSession } from '@/test/factories';
import { apiUrl, csrfHandler, saleHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { mockLocation, resetLocation } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);
vi.mock('../open-invoice', () => ({ openInvoice: vi.fn() }));
// En jsdom, `fetch` no envía un `FormData`: la subida se reemplaza aquí y se prueba de verdad en el
// entorno `node` (`mutations-files.test.ts`).
vi.mock('../invoice-api', () => ({ putInvoice: vi.fn() }));

import { ApiError } from '@/lib/api/errors';

import { putInvoice } from '../invoice-api';
import { openInvoice } from '../open-invoice';
import { SaleDetailScreen } from './sale-detail-screen';

const INVOICE = {
  file_name: 'factura-0001.pdf',
  content_type: 'application/pdf',
  size: 284113,
  uploaded_at: '2026-11-20T15:12:00Z',
};
const WITH_INVOICE = buildSale({ invoice: INVOICE });
const SELLER = [PERMISSIONS.SALES_VIEW, PERMISSIONS.SALES_ADD];

afterEach(() => vi.restoreAllMocks());

beforeEach(() => {
  resetLocation();
  mockLocation.path = '/ventas/detalle';
  mockLocation.search = '?id=s1';
  vi.mocked(openInvoice).mockReset().mockResolvedValue(undefined);
  vi.mocked(putInvoice).mockReset().mockResolvedValue(WITH_INVOICE);
  vi.spyOn(notify, 'success').mockImplementation(() => '');
  vi.spyOn(notify, 'warning').mockImplementation(() => '');
  server.use(csrfHandler, saleHandler(WITH_INVOICE));
});

function renderScreen(permissions = SELLER) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: `sale-invoice-${crypto.randomUUID()}`,
      permissions,
    }),
  );
  return renderWithProviders(<SaleDetailScreen />, { queryClient });
}

const invoiceSection = () =>
  screen.findByRole('region', { name: 'Soporte de la factura' });

const pdf = (size = 300 * 1024) => {
  const file = new File(['%PDF-1.4'], 'nueva.pdf', {
    type: 'application/pdf',
  });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const buttonNames = (section: HTMLElement) =>
  within(section)
    .getAllByRole('button')
    .map((button) => button.textContent?.trim());

describe('the invoice of a sale', () => {
  it('shows the file with its size, and what can be done with it', async () => {
    renderScreen();

    const section = await invoiceSection();
    expect(section).toHaveTextContent('factura-0001.pdf');
    expect(section).toHaveTextContent('277 KB');
    expect(buttonNames(section)).toEqual(['Ver', 'Reemplazar', 'Quitar']);
  });

  it('offers to attach one when there is none', async () => {
    server.use(saleHandler(buildSale()));
    renderScreen();

    const section = await invoiceSection();
    expect(section).toHaveTextContent('Sin soporte');
    expect(buttonNames(section)).toEqual(['Adjuntar soporte']);
  });

  it('only lets see the invoice of a voided sale, or to whoever only consults', async () => {
    server.use(saleHandler(buildSale({ invoice: INVOICE, status: 'voided' })));
    const voided = renderScreen();
    expect(buttonNames(await invoiceSection())).toEqual(['Ver']);
    voided.unmount();

    server.use(saleHandler(WITH_INVOICE));
    renderScreen([PERMISSIONS.SALES_VIEW]);
    expect(buttonNames(await invoiceSection())).toEqual(['Ver']);
  });

  it('opens the invoice', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(
      within(await invoiceSection()).getByRole('button', { name: 'Ver' }),
    );

    expect(openInvoice).toHaveBeenCalledWith('s1', 'factura-0001.pdf');
  });

  it('says when the invoice could not be opened', async () => {
    const user = userEvent.setup();
    vi.mocked(openInvoice).mockRejectedValue(new TypeError('Failed to fetch'));
    renderScreen();

    const section = await invoiceSection();
    await user.click(within(section).getByRole('button', { name: 'Ver' }));

    expect(
      await within(section).findByText(
        'No fue posible abrir el soporte. Inténtalo nuevamente.',
      ),
    ).toBeInTheDocument();
  });

  it('attaches a file and announces it', async () => {
    const user = userEvent.setup();
    server.use(saleHandler(buildSale()));
    renderScreen();

    await invoiceSection();
    await user.upload(screen.getByLabelText('Archivo del soporte'), pdf());

    await waitFor(() =>
      expect(notify.success).toHaveBeenCalledWith('Soporte adjuntado.'),
    );
    expect(putInvoice).toHaveBeenCalledWith('s1', expect.any(File));
  });

  it('refuses a file that is not a PDF, JPG or PNG of up to 5 MB, without sending it', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderScreen();

    const section = await invoiceSection();
    await user.upload(
      screen.getByLabelText('Archivo del soporte'),
      pdf(MAX_UPLOAD_BYTES + 1),
    );

    expect(
      await within(section).findByText(
        'Solo se permiten PDF, JPG o PNG de hasta 5 MB.',
      ),
    ).toBeInTheDocument();
    expect(putInvoice).not.toHaveBeenCalled();
  });

  it('says why the server refused the file', async () => {
    const user = userEvent.setup();
    vi.mocked(putInvoice).mockRejectedValue(
      new ApiError(413, {
        detail: 'El archivo supera el tamaño máximo de 5 MB.',
        code: 'invoice_too_large',
        fields: {},
      }),
    );
    renderScreen();

    const section = await invoiceSection();
    await user.upload(screen.getByLabelText('Archivo del soporte'), pdf());

    expect(
      await within(section).findByText(
        'El archivo supera el tamaño máximo de 5 MB.',
      ),
    ).toBeInTheDocument();
  });

  it('warns when the sale was voided meanwhile', async () => {
    const user = userEvent.setup();
    vi.mocked(putInvoice).mockRejectedValue(
      new ApiError(409, {
        detail: 'La venta está anulada.',
        code: 'sale_voided',
        fields: {},
      }),
    );
    renderScreen();

    await invoiceSection();
    await user.upload(screen.getByLabelText('Archivo del soporte'), pdf());

    await waitFor(() =>
      expect(notify.warning).toHaveBeenCalledWith('La venta está anulada.'),
    );
  });

  it('asks before removing the invoice, and removes it', async () => {
    const user = userEvent.setup();
    let removed = false;
    server.use(
      http.delete(apiUrl('/api/sales/:id/invoice'), () => {
        removed = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderScreen();

    await user.click(
      within(await invoiceSection()).getByRole('button', { name: 'Quitar' }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: '¿Quitar el soporte de la factura? La venta no cambia.',
    });
    expect(
      within(dialog).getByRole('button', { name: 'Cancelar' }),
    ).toHaveFocus();
    await user.click(
      within(dialog).getByRole('button', { name: 'Quitar soporte' }),
    );

    await waitFor(() =>
      expect(notify.success).toHaveBeenCalledWith('Soporte quitado.'),
    );
    expect(removed).toBe(true);
  });

  it('keeps the actions in sight but disabled without a connection', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderScreen();

    const section = await invoiceSection();
    for (const name of ['Ver', 'Reemplazar', 'Quitar']) {
      expect(within(section).getByRole('button', { name })).toBeDisabled();
    }
  });
});
