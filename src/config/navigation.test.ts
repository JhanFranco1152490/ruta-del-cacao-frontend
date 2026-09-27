import { Sprout } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { PERMISSIONS } from '@/lib/permissions';

import {
  NAV_ITEMS,
  isActiveRoute,
  visibleNavItems,
  type NavItem,
} from './navigation';

const open: NavItem = { href: '/abierta', label: 'Abierta', icon: Sprout };
const guarded: NavItem = {
  href: '/protegida',
  label: 'Protegida',
  icon: Sprout,
  permission: PERMISSIONS.PRODUCERS_VIEW,
};

describe('visibleNavItems', () => {
  it('keeps an entry whose permission the user has', () => {
    const items = visibleNavItems([guarded], [PERMISSIONS.PRODUCERS_VIEW]);

    expect(items).toEqual([guarded]);
  });

  it('hides an entry whose permission the user lacks', () => {
    expect(visibleNavItems([guarded], ['accounts.users_view'])).toEqual([]);
  });

  it('shows an entry without a declared permission to any user', () => {
    expect(visibleNavItems([open], [])).toEqual([open]);
  });

  it('keeps the registry order', () => {
    const items = visibleNavItems(
      [guarded, open],
      [PERMISSIONS.PRODUCERS_VIEW],
    );

    expect(items.map((item) => item.href)).toEqual(['/protegida', '/abierta']);
  });

  it('handles an empty list of entries', () => {
    expect(visibleNavItems([], [PERMISSIONS.PRODUCERS_VIEW])).toEqual([]);
  });

  it('shows only the open entries when the session has no permissions', () => {
    expect(visibleNavItems([guarded, open], undefined)).toEqual([open]);
  });
});

describe('isActiveRoute', () => {
  it('matches the exact route', () => {
    expect(isActiveRoute('/productores', '/productores')).toBe(true);
  });

  it('matches a child route', () => {
    expect(isActiveRoute('/productores', '/productores/nuevo')).toBe(true);
    expect(isActiveRoute('/productores', '/productores/abc/editar')).toBe(true);
  });

  it('does not match a route that only shares the prefix text', () => {
    expect(isActiveRoute('/productores', '/productores-x')).toBe(false);
  });

  it('does not match a different section', () => {
    expect(isActiveRoute('/panel', '/productores')).toBe(false);
    expect(isActiveRoute('/productores', '/panel')).toBe(false);
  });
});

describe('NAV_ITEMS', () => {
  it('starts with the panel and the producers', () => {
    expect(NAV_ITEMS.map((item) => item.href)).toEqual([
      '/panel',
      '/productores',
    ]);
  });

  it('gates producers behind its view permission and leaves the panel open', () => {
    const byHref = Object.fromEntries(NAV_ITEMS.map((i) => [i.href, i]));

    expect(byHref['/panel'].permission).toBeUndefined();
    expect(byHref['/productores'].permission).toBe(PERMISSIONS.PRODUCERS_VIEW);
  });
});
