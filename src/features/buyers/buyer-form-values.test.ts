import { describe, expect, it } from 'vitest';

import { buildBuyer } from '@/test/factories';

import {
  emptyBuyerForm,
  toCreateRequest,
  toFormValues,
  toUpdateRequest,
} from './buyer-form-values';
import type { BuyerFormValues } from './buyer-schema';

const filled: BuyerFormValues = {
  ...emptyBuyerForm,
  name: '  Acopio La Ceiba  ',
  identity_document: ' 900000002 ',
  buyer_type: 'intermediary',
  contact_name: '   ',
  phone: '',
  email: ' Compras@Example.com ',
};

describe('emptyBuyerForm', () => {
  it('starts with NIT and no buyer type chosen', () => {
    expect(emptyBuyerForm.document_type).toBe('NIT');
    expect(emptyBuyerForm.buyer_type).toBe('');
  });
});

describe('toCreateRequest', () => {
  it('trims, sends empty optionals as null and lowercases the email', () => {
    expect(toCreateRequest(filled)).toEqual({
      name: 'Acopio La Ceiba',
      document_type: 'NIT',
      identity_document: '900000002',
      buyer_type: 'intermediary',
      contact_name: null,
      phone: null,
      email: 'compras@example.com',
    });
  });

  it('sends the producer only when the technical account chose one', () => {
    expect(toCreateRequest({ ...filled, producer_id: 'p9' }).producer_id).toBe(
      'p9',
    );
    expect(toCreateRequest(filled)).not.toHaveProperty('producer_id');
  });
});

describe('toUpdateRequest', () => {
  const buyer = buildBuyer({ version: 4 });

  it('sends nothing when nothing really changed', () => {
    const values = toFormValues(buyer) as BuyerFormValues;
    expect(toUpdateRequest(values, buyer)).toBeNull();
    expect(
      toUpdateRequest({ ...values, name: ` ${buyer.name} ` }, buyer),
    ).toBeNull();
  });

  it('sends only the changed fields with the version that was read', () => {
    const values = toFormValues(buyer) as BuyerFormValues;
    expect(
      toUpdateRequest(
        { ...values, identity_document: '900000009', email: '' },
        buyer,
      ),
    ).toEqual({
      identity_document: '900000009',
      email: null,
      expected_version: 4,
    });
  });

  it('uses the newer version after another person changed the buyer', () => {
    const values = toFormValues(buyer) as BuyerFormValues;
    expect(
      toUpdateRequest({ ...values, buyer_type: 'exporter' }, buyer, 5),
    ).toEqual({ buyer_type: 'exporter', expected_version: 5 });
  });
});

describe('toFormValues', () => {
  it('shows the missing optionals as empty fields', () => {
    const values = toFormValues(
      buildBuyer({ contact_name: null, email: null }),
    );
    expect(values.contact_name).toBe('');
    expect(values.email).toBe('');
  });
});
