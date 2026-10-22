import { describe, expect, it } from 'vitest';

import { apiPath } from './path';

describe('apiPath', () => {
  it('sends only the values that say something, false included', () => {
    expect(
      apiPath('/api/plots', {
        search: 'loma',
        farm: undefined,
        producer: null,
        ordering: '',
        is_active: false,
        page: 2,
      }),
    ).toBe('/api/plots?search=loma&is_active=false&page=2');
  });

  it('leaves the path alone without a query', () => {
    expect(apiPath('/api/cacao-varieties', { search: '' })).toBe(
      '/api/cacao-varieties',
    );
  });
});
