// La librería con la que Next lee `source` viene empaquetada sin tipos.
// @ts-expect-error sin declaración de tipos
import { pathToRegexp } from 'next/dist/compiled/path-to-regexp';
import { describe, expect, it } from 'vitest';

import { LEGACY_REDIRECTS } from './redirects';

describe('LEGACY_REDIRECTS', () => {
  it('sends the old panel to the entry of the app', () => {
    expect(LEGACY_REDIRECTS).toContainEqual({
      source: '/panel',
      destination: '/',
      permanent: false,
    });
  });

  it('sends the old farm edit route to the fixed one', () => {
    expect(LEGACY_REDIRECTS).toContainEqual({
      source: '/fincas/:id((?!parcelas/)[^/]+)/editar',
      destination: '/fincas/editar?id=:id',
      permanent: false,
    });
  });

  // Se prueba con la misma librería con la que Next lee `source`.
  it('does not take the plot editor route for a farm called "parcelas"', () => {
    const farmEdit = LEGACY_REDIRECTS.find(
      ({ destination }) => destination === '/fincas/editar?id=:id',
    )!;
    const regexp = pathToRegexp(farmEdit.source) as RegExp;

    expect(regexp.test('/fincas/abc-123/editar')).toBe(true);
    expect(regexp.test('/fincas/parcelas/editar')).toBe(false);
  });
});
