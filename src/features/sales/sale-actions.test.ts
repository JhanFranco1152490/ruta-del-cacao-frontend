import { describe, expect, it } from 'vitest';

import { PERMISSIONS } from '@/lib/permissions';
import { buildSaleListItem } from '@/test/factories';

import {
  registerOffer,
  type SalePermissions,
  salePermissionsOf,
  saleOffers,
} from './sale-actions';
import { OFFLINE_INVOICE_REASON, OFFLINE_SALES_REASON } from './sale-messages';

const ALL: SalePermissions = {
  view: true,
  add: true,
  void: true,
  viewLot: true,
  viewBuyer: true,
  addBuyer: true,
};
const VIEW_ONLY: SalePermissions = {
  ...ALL,
  add: false,
  void: false,
};

const INVOICE = {
  file_name: 'factura-0001.pdf',
  content_type: 'application/pdf',
  size: 284113,
  uploaded_at: '2026-11-20T15:12:00Z',
};

const actionsOf = (offers: ReturnType<typeof saleOffers>) =>
  offers.map(({ action }) => action);

describe('salePermissionsOf', () => {
  it('reads the sale permissions and the ones of the screens it links to', () => {
    expect(
      salePermissionsOf({
        permissions: [PERMISSIONS.SALES_VIEW, PERMISSIONS.BUYERS_VIEW],
      }),
    ).toEqual({
      view: true,
      add: false,
      void: false,
      viewLot: false,
      viewBuyer: true,
      addBuyer: false,
    });
  });
});

describe('registerOffer', () => {
  it('is offered only with permission, and needs a connection', () => {
    expect(registerOffer(VIEW_ONLY, true)).toBeNull();
    expect(registerOffer(ALL, true)?.disabledReason).toBeNull();
    expect(registerOffer(ALL, false)?.disabledReason).toBe(
      OFFLINE_SALES_REASON,
    );
  });
});

describe('saleOffers', () => {
  it('offers to attach the invoice and void a registered sale without one', () => {
    expect(actionsOf(saleOffers(buildSaleListItem(), ALL, true))).toEqual([
      'attach',
      'void',
    ]);
  });

  it('offers to view, replace and remove an invoice that is there', () => {
    expect(
      actionsOf(saleOffers(buildSaleListItem({ invoice: INVOICE }), ALL, true)),
    ).toEqual(['view-invoice', 'replace', 'remove', 'void']);
  });

  it('only lets a voided sale show its invoice', () => {
    expect(
      actionsOf(
        saleOffers(
          buildSaleListItem({ status: 'voided', invoice: INVOICE }),
          ALL,
          true,
        ),
      ),
    ).toEqual(['view-invoice']);
    expect(
      saleOffers(buildSaleListItem({ status: 'voided' }), ALL, true),
    ).toEqual([]);
  });

  it('leaves only the invoice to whoever just consults', () => {
    expect(
      actionsOf(
        saleOffers(buildSaleListItem({ invoice: INVOICE }), VIEW_ONLY, true),
      ),
    ).toEqual(['view-invoice']);
  });

  it('keeps every action in sight without a connection, saying why it waits', () => {
    const offers = saleOffers(
      buildSaleListItem({ invoice: INVOICE }),
      ALL,
      false,
    );
    expect(offers.map(({ disabledReason }) => disabledReason)).toEqual([
      OFFLINE_INVOICE_REASON,
      OFFLINE_SALES_REASON,
      OFFLINE_SALES_REASON,
      OFFLINE_SALES_REASON,
    ]);
  });

  it('marks voiding as the dangerous one', () => {
    const offers = saleOffers(buildSaleListItem(), ALL, true);
    expect(offers.find(({ action }) => action === 'void')?.danger).toBe(true);
  });
});
