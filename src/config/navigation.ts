import { LayoutDashboard, Sprout, type LucideIcon } from 'lucide-react';

import { PERMISSIONS, type Permission } from '@/lib/permissions';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  // Sin permiso, la entrada es para cualquier persona autenticada.
  permission?: Permission;
};

// Cada sección nueva de la app se suma aquí con una entrada.
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/panel', label: 'Panel', icon: LayoutDashboard },
  {
    href: '/productores',
    label: 'Productores',
    icon: Sprout,
    permission: PERMISSIONS.PRODUCERS_VIEW,
  },
];

export function visibleNavItems(
  items: readonly NavItem[],
  permissions: readonly string[] | undefined,
): NavItem[] {
  return items.filter(
    ({ permission }) => !permission || !!permissions?.includes(permission),
  );
}

// El prefijo exige la barra: '/productores-x' no cuenta como hija de '/productores'.
export function isActiveRoute(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
