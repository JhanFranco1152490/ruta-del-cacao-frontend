import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildProducer } from '@/test/factories';

import {
  emptyProducerForm,
  producerFormSchema,
  toFormValues,
  toProducerRequest,
} from './schemas';

const valid = {
  ...emptyProducerForm,
  document_type: 'CC',
  identity_document: '1234567890',
  first_name: 'Ana',
  last_name: 'Prueba',
  municipality_code: '54001',
  joined_on: '2026-03-15',
} as const;

const messages = (values: object) =>
  producerFormSchema
    .safeParse(values)
    .error?.issues.map((issue) => issue.message) ?? [];

afterEach(() => vi.useRealTimers());

describe('producerFormSchema', () => {
  it('accepts a producer without optional contact data', () => {
    expect(producerFormSchema.safeParse(valid).success).toBe(true);
  });

  it('reports the required fields', () => {
    expect(messages(emptyProducerForm)).toEqual(
      expect.arrayContaining([
        'Ingresa solo números, entre 6 y 15 dígitos.',
        'Ingresa los nombres.',
        'Ingresa los apellidos.',
        'Selecciona un municipio.',
        'Ingresa la fecha de vinculación.',
      ]),
    );
  });

  it('rejects malformed contact data', () => {
    expect(messages({ ...valid, phone: '300123' })).toContain(
      'El teléfono debe tener entre 7 y 10 dígitos.',
    );
    expect(messages({ ...valid, phone: '300 123 4567' })).toContain(
      'El teléfono debe tener entre 7 y 10 dígitos.',
    );
    expect(messages({ ...valid, email: 'no-es-correo' })).toContain(
      'Ingresa un correo electrónico válido.',
    );
  });

  it('rejects documents that are too short or not numeric', () => {
    expect(messages({ ...valid, identity_document: '12345' })).toContain(
      'Ingresa solo números, entre 6 y 15 dígitos.',
    );
    expect(messages({ ...valid, identity_document: '12.345-ABC' })).toContain(
      'Ingresa solo números, entre 6 y 15 dígitos.',
    );
  });

  it('accepts 15 digits in the document and rejects 16', () => {
    expect(
      producerFormSchema.safeParse({
        ...valid,
        identity_document: '123456789012345',
      }).success,
    ).toBe(true);
    expect(
      messages({ ...valid, identity_document: '1234567890123456' }),
    ).toContain('Ingresa solo números, entre 6 y 15 dígitos.');
  });

  it('rejects a joining date after today in Bogotá, and accepts today', () => {
    vi.useFakeTimers();
    // 03:30 UTC del 25 es el 24 en Bogotá.
    vi.setSystemTime(new Date('2026-09-25T03:30:00Z'));

    expect(messages({ ...valid, joined_on: '2026-09-25' })).toContain(
      'La fecha no puede ser posterior a hoy.',
    );
    expect(
      producerFormSchema.safeParse({ ...valid, joined_on: '2026-09-24' })
        .success,
    ).toBe(true);
  });
});

describe('toProducerRequest', () => {
  it('sends empty contact fields as null and normalizes text', () => {
    expect(
      toProducerRequest({
        ...valid,
        first_name: ' Ana ',
        phone: '',
        email: '',
      }),
    ).toMatchObject({ first_name: 'Ana', phone: null, email: null });
  });

  it('lowercases the email and keeps the phone digits', () => {
    expect(
      toProducerRequest({
        ...valid,
        phone: '3001234567',
        email: ' ANA@Example.COM ',
      }),
    ).toMatchObject({ phone: '3001234567', email: 'ana@example.com' });
  });
});

describe('toFormValues', () => {
  it('turns null contact fields into empty strings for the form', () => {
    const values = toFormValues(
      buildProducer({ phone: null, email: null, first_name: 'Ana' }),
    );

    expect(values).toMatchObject({ phone: '', email: '', first_name: 'Ana' });
  });
});
