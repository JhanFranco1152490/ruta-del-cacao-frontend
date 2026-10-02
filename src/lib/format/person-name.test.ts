import { describe, expect, it } from 'vitest';

import { fullName } from './person-name';

describe('fullName', () => {
  it('joins the first and last names', () => {
    expect(fullName({ first_name: 'Ana María', last_name: 'Rojas' })).toBe(
      'Ana María Rojas',
    );
  });

  it('works with only one of the names', () => {
    expect(fullName({ first_name: 'Ana', last_name: '' })).toBe('Ana');
  });

  it('is empty when the account has no names', () => {
    expect(fullName({})).toBe('');
  });
});
