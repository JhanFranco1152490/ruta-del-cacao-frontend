import { describe, expect, it } from 'vitest';

import { OFFLINE_PRECACHE_ROUTES } from './offline-routes';

describe('OFFLINE_PRECACHE_ROUTES', () => {
  it('saves the entry of the app, so the installed app opens without a connection', () => {
    expect(OFFLINE_PRECACHE_ROUTES).toContain('/');
  });

  it('saves the fixed farm screens, whose id travels in the address', () => {
    expect(OFFLINE_PRECACHE_ROUTES).toEqual(
      expect.arrayContaining([
        '/fincas/detalle',
        '/fincas/editar',
        '/fincas/parcelas/nueva',
        '/fincas/parcelas/editar',
        '/fincas/parcelas/caracterizacion',
      ]),
    );
  });

  it('never saves the sign-in page or the old panel', () => {
    expect(OFFLINE_PRECACHE_ROUTES).not.toContain('/iniciar-sesion');
    expect(OFFLINE_PRECACHE_ROUTES).not.toContain('/panel');
  });
});
