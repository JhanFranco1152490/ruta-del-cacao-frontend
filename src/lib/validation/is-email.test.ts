import { describe, expect, it } from 'vitest';

import { isEmail } from './is-email';

describe('isEmail', () => {
  it.each([
    'persona@example.com',
    'a@b.co',
    'ana!prueba@example.com',
    'persona@bücher.example',
  ])(
    'accepts %s (the server is the authority on the exact format)',
    (value) => {
      expect(isEmail(value)).toBe(true);
    },
  );

  it.each([
    '',
    'no-es-correo',
    'persona@example',
    'persona@',
    '@example.com',
    'per sona@example.com',
    'persona@@example.com',
  ])('rejects %s', (value) => {
    expect(isEmail(value)).toBe(false);
  });
});
