import { describe, expect, it } from 'vitest';

import { isInternalPath, readOrigin, withOrigin } from './origin';

describe('isInternalPath', () => {
  it.each([
    '/parcelas',
    '/parcelas?finca=f1&pagina=3',
    '/fincas/detalle?id=f1',
    '/fincas/parcelas/nueva?finca=f1',
    '/productores?buscar=ana&estado=active',
    '/actividades?vista=mes&mes=2026-10#hoy',
  ])('accepts a route of the app: %s', (path) => {
    expect(isInternalPath(path)).toBe(true);
  });

  it.each([
    ['another site', '//otro.sitio/fincas'],
    ['another site with a backslash', '/\\otro.sitio'],
    ['a backslash inside the path', '/fincas\\..\\otro'],
    ['an absolute address', 'https://otro.sitio/fincas'],
    ['a script', 'javascript:alert(1)'],
    ['a script that starts with a slash', '/javascript:alert(1)'],
    ['no leading slash', 'fincas'],
    ['empty', ''],
    ['a control character', '/fincas\n'],
    ['a tab', '/fin\tcas'],
    ['the entrance, which is not a section', '/'],
    ['a section that does not exist', '/panel-secreto'],
    ['a section that only starts the same', '/fincasx'],
  ])('rejects %s', (_name, path) => {
    expect(isInternalPath(path)).toBe(false);
  });

  it('rejects what is not text', () => {
    expect(isInternalPath(null)).toBe(false);
    expect(isInternalPath(undefined)).toBe(false);
    expect(isInternalPath(42)).toBe(false);
    expect(isInternalPath(['/fincas'])).toBe(false);
  });

  it('rejects a path longer than 2000 characters', () => {
    expect(isInternalPath(`/fincas?buscar=${'a'.repeat(2000)}`)).toBe(false);
  });

  it('does not let an encoded double slash get out', () => {
    expect(isInternalPath('/%2F%2Fotro.sitio')).toBe(false);
  });
});

describe('readOrigin', () => {
  it('reads a valid origin', () => {
    const params = new URLSearchParams({
      origen: '/parcelas?finca=f1&pagina=3',
    });

    expect(readOrigin(params)).toBe('/parcelas?finca=f1&pagina=3');
  });

  it('gives null without it, with an invalid one, or without parameters', () => {
    expect(readOrigin(new URLSearchParams())).toBeNull();
    expect(
      readOrigin(new URLSearchParams({ origen: 'https://otro.sitio' })),
    ).toBeNull();
    expect(readOrigin(null)).toBeNull();
    expect(readOrigin(undefined)).toBeNull();
  });
});

describe('withOrigin', () => {
  it('remembers the current screen with its filters in the editor address', () => {
    const href = withOrigin(
      '/fincas/parcelas/editar?id=p1',
      '/parcelas?finca=f1&pagina=3',
    );

    expect(new URL(href, 'http://x').searchParams.get('id')).toBe('p1');
    expect(readOrigin(new URL(href, 'http://x').searchParams)).toBe(
      '/parcelas?finca=f1&pagina=3',
    );
  });

  it('adds the parameter to an address that had none', () => {
    const href = withOrigin('/productores/nuevo', '/productores?buscar=ana');

    expect(href.startsWith('/productores/nuevo?origen=')).toBe(true);
    expect(readOrigin(new URL(href, 'http://x').searchParams)).toBe(
      '/productores?buscar=ana',
    );
  });

  it('does not carry the origin of an editor into the next one', () => {
    const href = withOrigin(
      '/fincas/editar?id=f1',
      '/fincas/parcelas/editar?id=p1&origen=%2Fparcelas%3Fpagina%3D3',
    );
    const origin = readOrigin(new URL(href, 'http://x').searchParams)!;

    expect(origin).toBe('/fincas/parcelas/editar?id=p1');
    expect(origin).not.toContain('origen');
  });

  it('leaves the address alone when the current screen is not valid', () => {
    expect(withOrigin('/fincas/editar?id=f1', 'https://otro.sitio')).toBe(
      '/fincas/editar?id=f1',
    );
  });
});
