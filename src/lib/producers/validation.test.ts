import { describe, expect, it } from 'vitest';

import { normalizeProducerInput, producerFormSchema } from './validation';

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

describe('normalizeProducerInput', () => {
  it('trims values without changing document digits', () => {
    expect(
      normalizeProducerInput({
        ...validProducer,
        identity_document: ' 001234 ',
        first_name: ' Nombre ',
        email: ' CORREO@EJEMPLO.COM ',
        phone: '300 123-4567',
      }),
    ).toMatchObject({
      identity_document: '001234',
      first_name: 'Nombre',
      email: 'correo@ejemplo.com',
      phone: '3001234567',
    });
  });
});

describe('producerFormSchema', () => {
  it('accepts a valid producer without optional contact information', () => {
    expect(producerFormSchema.safeParse(validProducer).success).toBe(true);
  });

  it('reports required and invalid contact fields', () => {
    const result = producerFormSchema.safeParse({
      ...validProducer,
      identity_document: '12ABC',
      first_name: '',
      last_name: '',
      municipality_code: '',
      email: 'correo-invalido',
      phone: '123',
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.flatten().fieldErrors).toMatchObject({
      identity_document: [expect.any(String)],
      first_name: [expect.any(String)],
      last_name: [expect.any(String)],
      municipality_code: [expect.any(String)],
      email: [expect.any(String)],
      phone: [expect.any(String)],
    });
  });

  it('rejects formatted and overlong phone numbers', () => {
    expect(
      producerFormSchema.safeParse({
        ...validProducer,
        phone: '300 123 4567',
      }).success,
    ).toBe(false);
    expect(
      producerFormSchema.safeParse({
        ...validProducer,
        phone: '30012345678',
      }).success,
    ).toBe(false);
  });
});
