import {
  LayoutDashboard,
  MapPinned,
  ShieldCheck,
  Sprout,
  Users,
} from 'lucide-react';

import { PERMISSIONS } from '@/lib/permissions';
import type { NavItem } from '@/types/navigation';

// Cada sección nueva de la app se suma aquí con una entrada.
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/panel', label: 'Panel', icon: LayoutDashboard },
  {
    href: '/productores',
    label: 'Productores',
    icon: Sprout,
    permission: PERMISSIONS.PRODUCERS_VIEW,
  },
  {
    href: '/fincas',
    label: 'Fincas',
    icon: MapPinned,
    permission: PERMISSIONS.FARMS_VIEW,
  },
  {
    href: '/roles',
    label: 'Roles y permisos',
    icon: ShieldCheck,
    permission: PERMISSIONS.ROLES_VIEW,
  },
  {
    href: '/usuarios',
    label: 'Usuarios',
    icon: Users,
    permission: PERMISSIONS.USERS_VIEW,
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
