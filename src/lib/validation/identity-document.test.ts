import { describe, expect, it } from 'vitest';

import { isIdentityDocument } from './identity-document';

describe('isIdentityDocument', () => {
  it('accepts from 6 to 15 digits, leading zeros included', () => {
    expect(isIdentityDocument('123456')).toBe(true);
    expect(isIdentityDocument('012345678901234')).toBe(true);
  });

  it('rejects 5 or 16 digits', () => {
    expect(isIdentityDocument('12345')).toBe(false);
    expect(isIdentityDocument('1234567890123456')).toBe(false);
  });

  it('rejects dots, dashes and spaces', () => {
    expect(isIdentityDocument('900.123.456')).toBe(false);
    expect(isIdentityDocument('900123456-7')).toBe(false);
    expect(isIdentityDocument('900 123 456')).toBe(false);
  });
});
