// @vitest-environment node
// El soporte viaja como formulario de varias partes: el `FormData` de jsdom no llega al `fetch` de
// las pruebas, así que estas corren en el entorno `node`, como el navegador.
import { HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { buildSale } from '@/test/factories';
import {
  csrfHandler,
  saleInvoiceHandler,
  saleWriteHandler,
} from '@/test/handlers';
import { server } from '@/test/server';

import type { SaleCreateRequest } from './api';
import { putInvoice, registerSale } from './mutations';

const REQUEST: SaleCreateRequest = {
  farm_id: 'f1',
  buyer_id: 'b1',
  sale_date: '2026-11-20',
  notes: '',
  lines: [
    { lot_id: 'l1', grade: 'g1', quantity_kg: '150.0', price_per_kg: 18500 },
  ],
};

const INVOICE = {
  file_name: 'factura.pdf',
  content_type: 'application/pdf',
  size: 8,
  uploaded_at: '2026-11-20T15:12:00Z',
};

const pdf = () =>
  new File(['%PDF-1.4'], 'factura.pdf', { type: 'application/pdf' });

const refusedFormat = () =>
  HttpResponse.json(
    {
      detail: 'Solo se permiten PDF, JPG o PNG.',
      code: 'invoice_format_not_allowed',
      fields: {},
    },
    { status: 415 },
  );

describe('registerSale', () => {
  it('uploads the invoice right after the sale, with its name', async () => {
    const files: File[] = [];
    const withInvoice = buildSale({ invoice: INVOICE, version: 2 });
    server.use(
      csrfHandler,
      saleWriteHandler('create', buildSale()),
      saleInvoiceHandler('attach', withInvoice, files),
    );

    const outcome = await registerSale(REQUEST, pdf());

    expect(files.map(({ name }) => name)).toEqual(['factura.pdf']);
    expect(await files[0].text()).toBe('%PDF-1.4');
    expect(outcome).toEqual({ sale: withInvoice, invoiceError: null });
  });

  it('keeps the sale when the invoice is refused, and says why', async () => {
    server.use(
      csrfHandler,
      saleWriteHandler('create', buildSale()),
      saleInvoiceHandler('attach', refusedFormat()),
    );

    const outcome = await registerSale(REQUEST, pdf());

    expect(outcome.sale).toEqual(buildSale());
    expect(outcome.invoiceError).toBeInstanceOf(ApiError);
    expect((outcome.invoiceError as ApiError).code).toBe(
      'invoice_format_not_allowed',
    );
  });

  it('uploads nothing without a file', async () => {
    const files: File[] = [];
    server.use(
      csrfHandler,
      saleWriteHandler('create', buildSale()),
      saleInvoiceHandler('attach', buildSale(), files),
    );

    await registerSale(REQUEST, null);

    expect(files).toEqual([]);
  });
});

describe('putInvoice', () => {
  it('sends the file as multipart and answers the sale', async () => {
    const files: File[] = [];
    server.use(
      csrfHandler,
      saleInvoiceHandler('attach', buildSale({ invoice: INVOICE }), files),
    );

    const sale = await putInvoice('s1', pdf());

    expect(files).toHaveLength(1);
    expect(sale.invoice).toEqual(INVOICE);
  });
});
