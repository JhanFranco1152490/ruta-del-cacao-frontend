import { describe, expect, it } from 'vitest';

import { LEGACY_REDIRECTS } from './redirects';

describe('LEGACY_REDIRECTS', () => {
  it('sends the old farm edit route to the fixed one', () => {
    expect(LEGACY_REDIRECTS).toContainEqual({
      source: '/fincas/:id/editar',
      destination: '/fincas/editar?id=:id',
      permanent: false,
    });
  });
});
