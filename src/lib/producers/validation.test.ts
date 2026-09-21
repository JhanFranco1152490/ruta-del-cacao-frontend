import { describe, expect, it } from 'vitest';

import { normalizeIdentityDocument, validateProducer } from './validation';

const validProducer = {
  document_type: 'CC' as const,
  identity_document: '1234567890',
  first_name: 'Nombre de prueba',
  last_name: 'Apellido de prueba',
  phone: null,
  email: null,
  municipality_code: '54001',
  joined_on: '2026-01-01',
};

describe('normalizeIdentityDocument', () => {
  it('removes presentation characters and preserves meaningful letters', () => {
    expect(normalizeIdentityDocument('  ab-12. 34 ')).toBe('AB1234');
  });
});

describe('validateProducer', () => {
  it('accepts a valid producer without optional contact information', () => {
    expect(validateProducer(validProducer)).toEqual({});
  });

  it('reports required and invalid contact fields', () => {
    const errors = validateProducer({
      ...validProducer,
      identity_document: '  ',
      first_name: '',
      last_name: '',
      municipality_code: '',
      email: 'correo-invalido',
      phone: '123',
    });

    expect(errors).toMatchObject({
      identity_document: expect.any(String),
      first_name: expect.any(String),
      last_name: expect.any(String),
      municipality_code: expect.any(String),
      email: expect.any(String),
      phone: expect.any(String),
    });
  });
});
