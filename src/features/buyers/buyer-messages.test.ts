import { describe, expect, it } from 'vitest';

import { duplicateDocumentMessage } from './buyer-messages';

describe('duplicateDocumentMessage', () => {
  it('names the buyer that has the document without a double period', () => {
    expect(
      duplicateDocumentMessage('Chocolates del Oriente S.A.S.', true),
    ).toBe(
      'Ya tienes registrado este documento: Chocolates del Oriente S.A.S.',
    );
    expect(duplicateDocumentMessage('Acopio La Ceiba', true)).toBe(
      'Ya tienes registrado este documento: Acopio La Ceiba.',
    );
  });

  it('says when that buyer is inactive', () => {
    expect(duplicateDocumentMessage('Acopio La Ceiba', false)).toBe(
      'Ya tienes registrado este documento: Acopio La Ceiba, que está inactivo.',
    );
  });
});
