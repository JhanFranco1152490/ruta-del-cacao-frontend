import { Sprout } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { PERMISSIONS } from '@/lib/permissions';
import type { NavItem } from '@/types/navigation';

import {
  NAV_ITEMS,
  homeNavItem,
  isActiveRoute,
  navItemForPath,
  visibleNavItems,
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
  it('lists the domain sections and then administration', () => {
    expect(NAV_ITEMS.map((item) => item.href)).toEqual([
      '/productores',
      '/fincas',
      '/roles',
      '/usuarios',
    ]);
  });

  it('gates every section behind its view permission', () => {
    const byHref = Object.fromEntries(NAV_ITEMS.map((i) => [i.href, i]));

    expect(byHref['/productores'].permission).toBe(PERMISSIONS.PRODUCERS_VIEW);
    expect(byHref['/fincas'].permission).toBe(PERMISSIONS.FARMS_VIEW);
    expect(byHref['/roles'].permission).toBe(PERMISSIONS.ROLES_VIEW);
    expect(byHref['/usuarios'].permission).toBe(PERMISSIONS.USERS_VIEW);
  });

  it('marks the office sections as needing a connection', () => {
    expect(
      NAV_ITEMS.filter((item) => item.needsConnection).map((item) => item.href),
    ).toEqual(['/productores', '/roles', '/usuarios']);
  });
});

const office: NavItem = {
  href: '/oficina',
  label: 'Oficina',
  icon: Sprout,
  permission: PERMISSIONS.PRODUCERS_VIEW,
  needsConnection: true,
};
const field: NavItem = {
  href: '/campo',
  label: 'Campo',
  icon: Sprout,
  permission: PERMISSIONS.FARMS_VIEW,
};

describe('navItemForPath', () => {
  it('finds the section of a child route', () => {
    expect(navItemForPath([office, field], '/campo/editar')).toBe(field);
  });

  it('finds nothing for a route outside the registry', () => {
    expect(navItemForPath([office, field], '/panel')).toBeUndefined();
  });
});

describe('homeNavItem', () => {
  const both = [PERMISSIONS.PRODUCERS_VIEW, PERMISSIONS.FARMS_VIEW];

  it('starts in the first section the person can see', () => {
    expect(homeNavItem([office, field], both, true)).toBe(office);
  });

  it('skips the sections the person cannot see', () => {
    expect(homeNavItem([office, field], [PERMISSIONS.FARMS_VIEW], true)).toBe(
      field,
    );
  });

  it('prefers a section that works without a connection when there is none', () => {
    expect(homeNavItem([office, field], both, false)).toBe(field);
  });

  it('falls back to the first section when none works without a connection', () => {
    expect(
      homeNavItem([office, field], [PERMISSIONS.PRODUCERS_VIEW], false),
    ).toBe(office);
  });

  it('has no start when the person can see no section', () => {
    expect(homeNavItem([office, field], [], true)).toBeUndefined();
  });
});
