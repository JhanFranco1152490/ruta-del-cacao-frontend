import { describe, expect, it } from 'vitest';

import { buildBuyer } from '@/test/factories';

import { sameDocumentBuyer, sameNameBuyer } from './buyer-duplicates';

const known = [
  buildBuyer({
    id: 'b1',
    name: 'Chocolates del Oriente S.A.S.',
    document_type: 'NIT',
    identity_document: '900000001',
  }),
  buildBuyer({
    id: 'b2',
    name: 'Acopio La Ceiba',
    document_type: 'CC',
    identity_document: '1000000002',
    is_active: false,
  }),
];

describe('sameDocumentBuyer', () => {
  it('finds the buyer with the same type and number, active or inactive', () => {
    expect(sameDocumentBuyer(known, 'NIT', ' 900000001 ')).toEqual({
      id: 'b1',
      name: 'Chocolates del Oriente S.A.S.',
      is_active: true,
    });
    expect(sameDocumentBuyer(known, 'CC', '1000000002')?.is_active).toBe(false);
  });

  it('accepts the same number with another type', () => {
    expect(sameDocumentBuyer(known, 'CC', '900000001')).toBeNull();
  });

  it('does not count the buyer being edited', () => {
    expect(sameDocumentBuyer(known, 'NIT', '900000001', 'b1')).toBeNull();
  });

  it('says nothing while the number is empty', () => {
    expect(sameDocumentBuyer(known, 'NIT', '')).toBeNull();
  });
});

describe('sameNameBuyer', () => {
  it('finds a buyer written another way', () => {
    expect(sameNameBuyer(known, 'chocolates del oriente sas')?.id).toBe('b1');
  });

  it('does not count the buyer being edited, nor a different name', () => {
    expect(sameNameBuyer(known, 'Chocolates del Oriente S.A.S.', 'b1')).toBe(
      null,
    );
    expect(sameNameBuyer(known, 'Chocolates de Occidente')).toBeNull();
    expect(sameNameBuyer(known, '  ')).toBeNull();
  });
});
