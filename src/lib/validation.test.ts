import { describe, expect, it } from 'vitest';

import { validateDocument } from './validation';

describe('validateDocument', () => {
  it.each(['CC', 'CE', 'PPT', 'NIT'] as const)(
    'rechaza letras para %s',
    (type) => {
      expect(validateDocument(type, '12345A')).toContain('solo dígitos');
    },
  );

  it.each(['CC', 'CE', 'PPT', 'NIT'] as const)(
    'acepta solo dígitos para %s',
    (type) => {
      expect(validateDocument(type, '1234567890')).toBe('');
    },
  );

  it('rechaza un valor vacío', () => {
    expect(validateDocument('CC', '  ')).toContain('Ingresa tu número');
  });

  it('rechaza más de 15 dígitos', () => {
    expect(validateDocument('PPT', '1234567890123456')).toContain('máximo 15');
  });

  it('acepta exactamente 15 dígitos', () => {
    expect(validateDocument('NIT', '123456789012345')).toBe('');
  });
});
