import { describe, expect, it } from 'vitest';

import { emptyBuyerForm } from './buyer-form-values';
import { buyerFormSchema, CONTACT_REQUIRED_MESSAGE } from './buyer-schema';

const valid = {
  ...emptyBuyerForm,
  name: 'Chocolates del Oriente S.A.S.',
  identity_document: '900000001',
  buyer_type: 'chocolate_industry',
  phone: '3000000001',
} as const;

// El primer mensaje de cada campo, que es el que muestra el formulario.
const errorsOf = (values: object, options?: { needsProducer?: boolean }) => {
  const issues = buyerFormSchema(options).safeParse(values).error?.issues ?? [];
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = String(issue.path[0]);
    errors[field] ??= issue.message;
  }
  return errors;
};

describe('buyerFormSchema', () => {
  it('accepts a buyer with only a phone, or only an email', () => {
    expect(errorsOf(valid)).toEqual({});
    expect(
      errorsOf({ ...valid, phone: '', email: 'compras@example.com' }),
    ).toEqual({});
  });

  it('marks every required field when the form is empty', () => {
    expect(errorsOf(emptyBuyerForm)).toEqual({
      name: 'Campo obligatorio',
      identity_document: 'Campo obligatorio',
      buyer_type: 'Campo obligatorio',
      phone: CONTACT_REQUIRED_MESSAGE,
      email: CONTACT_REQUIRED_MESSAGE,
    });
  });

  it('asks for a phone or an email on both fields', () => {
    expect(errorsOf({ ...valid, phone: '  ', email: '' })).toEqual({
      phone: CONTACT_REQUIRED_MESSAGE,
      email: CONTACT_REQUIRED_MESSAGE,
    });
  });

  it('rejects a document with dots or with 5 digits, as for a producer', () => {
    const message = 'Ingresa solo números, entre 6 y 15 dígitos.';
    expect(errorsOf({ ...valid, identity_document: '900.000.001' })).toEqual({
      identity_document: message,
    });
    expect(errorsOf({ ...valid, identity_document: '12345' })).toEqual({
      identity_document: message,
    });
  });

  it('rejects a phone outside 7 to 10 digits, as for a producer', () => {
    expect(errorsOf({ ...valid, phone: '300-000' })).toEqual({
      phone: 'El teléfono debe tener entre 7 y 10 dígitos.',
    });
    expect(errorsOf({ ...valid, phone: '30000000011' })).toEqual({
      phone: 'El teléfono debe tener entre 7 y 10 dígitos.',
    });
  });

  it('rejects an invalid or too long email', () => {
    expect(errorsOf({ ...valid, email: 'compras@' })).toEqual({
      email: 'Ingresa un correo electrónico válido.',
    });
    expect(
      errorsOf({ ...valid, email: `${'a'.repeat(243)}@example.com` }),
    ).toEqual({ email: 'Usa máximo 254 caracteres.' });
  });

  it('keeps the name and the contact person between 2 and 120 characters', () => {
    expect(errorsOf({ ...valid, name: ' A ' })).toEqual({
      name: 'Escribe al menos 2 caracteres.',
    });
    expect(errorsOf({ ...valid, name: 'A'.repeat(121) })).toEqual({
      name: 'Usa máximo 120 caracteres.',
    });
    expect(errorsOf({ ...valid, contact_name: 'A' })).toEqual({
      contact_name: 'Escribe al menos 2 caracteres.',
    });
  });

  it('asks the technical account for the producer, and nobody else', () => {
    expect(errorsOf(valid, { needsProducer: true })).toEqual({
      producer_id: 'Campo obligatorio',
    });
    expect(
      errorsOf({ ...valid, producer_id: 'p1' }, { needsProducer: true }),
    ).toEqual({});
  });
});
