import { describe, expect, it } from 'vitest';

import {
  loginSchema,
  resetConfirmSchema,
  resetRequestSchema,
  toLoginRequest,
} from './schemas';

const base = {
  loginMethod: 'email',
  documentType: 'CC',
  identifier: '',
  password: 'cacao seguro',
} as const;
const messages = (result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) => result.error?.issues.map((issue) => issue.message) ?? [];

describe('loginSchema', () => {
  it('requires a valid email in email mode', () => {
    expect(
      messages(loginSchema.safeParse({ ...base, identifier: '' })),
    ).toContain('Ingresa tu correo electrónico.');
    expect(
      messages(loginSchema.safeParse({ ...base, identifier: 'no-es-correo' })),
    ).toContain('Ingresa un correo electrónico válido.');
    expect(
      loginSchema.safeParse({ ...base, identifier: 'persona@example.com' })
        .success,
    ).toBe(true);
  });

  it('validates the document in document mode after removing separators', () => {
    const doc = { ...base, loginMethod: 'document' } as const;

    expect(
      messages(loginSchema.safeParse({ ...doc, identifier: '' })),
    ).toContain('Ingresa tu número de documento.');
    expect(
      messages(loginSchema.safeParse({ ...doc, identifier: '12A45' })),
    ).toContain('El número de documento debe contener solo dígitos.');
    expect(
      messages(loginSchema.safeParse({ ...doc, identifier: '1'.repeat(16) })),
    ).toContain('El número de documento debe tener máximo 15 dígitos.');
    expect(
      loginSchema.safeParse({ ...doc, identifier: '1.090-123 456' }).success,
    ).toBe(true);
    expect(
      loginSchema.safeParse({ ...doc, identifier: '1'.repeat(15) }).success,
    ).toBe(true);
  });

  it('requires the password', () => {
    expect(
      messages(
        loginSchema.safeParse({ ...base, identifier: 'a@b.co', password: '' }),
      ),
    ).toContain('Ingresa tu contraseña.');
  });
});

describe('toLoginRequest', () => {
  it('builds the email payload without document fields', () => {
    expect(
      toLoginRequest({ ...base, identifier: ' persona@example.com ' }),
    ).toEqual({
      login_method: 'email',
      email: 'persona@example.com',
      password: 'cacao seguro',
    });
  });

  it('builds the document payload without the email', () => {
    expect(
      toLoginRequest({
        ...base,
        loginMethod: 'document',
        documentType: 'CE',
        identifier: '1090123456',
      }),
    ).toEqual({
      login_method: 'document',
      document_type: 'CE',
      identity_document: '1090123456',
      password: 'cacao seguro',
    });
  });
});

describe('resetRequestSchema', () => {
  it('requires a valid email', () => {
    expect(messages(resetRequestSchema.safeParse({ email: '' }))[0]).toBe(
      'Ingresa tu correo electrónico.',
    );
    expect(messages(resetRequestSchema.safeParse({ email: 'x' }))).toContain(
      'Ingresa un correo electrónico válido.',
    );
  });
});

describe('resetConfirmSchema', () => {
  it('applies the password policy and the confirmation', () => {
    const parse = (password: string, confirmation = password) =>
      resetConfirmSchema.safeParse({
        new_password: password,
        new_password_confirmation: confirmation,
      });

    expect(messages(parse(''))).toContain('Ingresa tu contraseña.');
    expect(messages(parse('corta'))).toContain(
      'La contraseña debe tener entre 8 y 50 caracteres.',
    );
    expect(messages(parse('a'.repeat(51)))).toContain(
      'La contraseña debe tener entre 8 y 50 caracteres.',
    );
    expect(messages(parse('12345678'))).toContain(
      'La contraseña no puede contener solo números.',
    );
    expect(messages(parse('frase segura 2026', 'otra frase'))).toContain(
      'Las contraseñas no coinciden.',
    );
    expect(parse('frase segura 2026').success).toBe(true);
  });
});
