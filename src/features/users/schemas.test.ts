import { describe, expect, it } from 'vitest';
import { accountSchema, emptyAccount } from './schemas';

describe('accountSchema', () => {
  const valid = {
    ...emptyAccount,
    email: 'persona@example.com',
    first_name: 'Ana',
    last_name: 'Prueba',
    identity_document: '123456',
    role_ids: ['rol-de-prueba'],
  };
  it.each(['12', 'abcdefgh', '12345678901'])(
    'rejects invalid phone %s',
    (phone) => {
      expect(accountSchema.safeParse({ ...valid, phone }).success).toBe(false);
    },
  );
  it.each(['', '3001234567'])('accepts optional or valid phone %s', (phone) => {
    expect(accountSchema.safeParse({ ...valid, phone }).success).toBe(true);
  });
});
