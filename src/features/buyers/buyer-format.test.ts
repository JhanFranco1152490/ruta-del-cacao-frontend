import { describe, expect, it } from 'vitest';

import { buyerCountText, contactMeansText, documentText } from './buyer-format';

describe('documentText', () => {
  it('writes the document with its short type', () => {
    expect(
      documentText({ document_type: 'NIT', identity_document: '900000001' }),
    ).toBe('NIT 900000001');
  });
});

describe('contactMeansText', () => {
  it('joins the phone and the email it has', () => {
    expect(
      contactMeansText({ phone: '3000000001', email: 'compras@example.com' }),
    ).toBe('3000000001 · compras@example.com');
    expect(
      contactMeansText({ phone: null, email: 'compras@example.com' }),
    ).toBe('compras@example.com');
  });
});

describe('buyerCountText', () => {
  it('agrees in number', () => {
    expect(buyerCountText(1)).toBe('1 comprador');
    expect(buyerCountText(0)).toBe('0 compradores');
  });
});
