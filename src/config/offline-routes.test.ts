import { describe, expect, it } from 'vitest';

import { OFFLINE_PRECACHE_ROUTES } from './offline-routes';

describe('OFFLINE_PRECACHE_ROUTES', () => {
  it('saves the entry of the app, so the installed app opens without a connection', () => {
    expect(OFFLINE_PRECACHE_ROUTES).toContain('/');
  });

  it('never saves the sign-in page or the old panel', () => {
    expect(OFFLINE_PRECACHE_ROUTES).not.toContain('/iniciar-sesion');
    expect(OFFLINE_PRECACHE_ROUTES).not.toContain('/panel');
  });
});
