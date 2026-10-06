import {
  LandPlot,
  Leaf,
  MapPinned,
  ShieldCheck,
  Sprout,
  Users,
} from 'lucide-react';

import { PERMISSIONS } from '@/lib/permissions';
import type { NavItem } from '@/types/navigation';

// Cada sección nueva de la app se suma aquí con una entrada. El orden decide también dónde
// entra cada persona: en la primera sección que puede ver.
export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: '/productores',
    label: 'Productores',
    icon: Sprout,
    permission: PERMISSIONS.PRODUCERS_VIEW,
    needsConnection: true,
  },
  {
    href: '/fincas',
    label: 'Fincas',
    icon: MapPinned,
    permission: PERMISSIONS.FARMS_VIEW,
    children: [
      {
        href: '/fincas/parcelas/nueva',
        label: 'Registrar parcela',
        icon: LandPlot,
        permission: PERMISSIONS.PLOTS_ADD,
      },
    ],
  },
  {
    href: '/variedades',
    label: 'Variedades de cacao',
    icon: Leaf,
    permission: PERMISSIONS.CROPS_MANAGE_VARIETIES,
    needsConnection: true,
  },
  {
    href: '/roles',
    label: 'Roles y permisos',
    icon: ShieldCheck,
    permission: PERMISSIONS.ROLES_VIEW,
    needsConnection: true,
  },
  {
    href: '/usuarios',
    label: 'Usuarios',
    icon: Users,
    permission: PERMISSIONS.USERS_VIEW,
    needsConnection: true,
  },
];

export function visibleNavItems(
  items: readonly NavItem[],
  permissions: readonly string[] | undefined,
): NavItem[] {
  const allowed = (permission?: string) =>
    !permission || !!permissions?.includes(permission);
  return items
    .filter(({ permission }) => allowed(permission))
    .map((item) =>
      item.children
        ? {
            ...item,
            children: item.children.filter(({ permission }) =>
              allowed(permission),
            ),
          }
        : item,
    );
}

// El prefijo exige la barra: '/productores-x' no cuenta como hija de '/productores'.
export function isActiveRoute(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// La sección a la que pertenece una ruta, o ninguna (como la entrada, `/`).
export function navItemForPath(
  items: readonly NavItem[],
  pathname: string,
): NavItem | undefined {
  return items.find((item) => isActiveRoute(item.href, pathname));
}

// Dónde entra la persona: la primera sección que puede ver. Sin conexión se prefiere la primera
// que funciona sin ella; si ninguna lo hace, la primera igual, que avisará que necesita conexión.
export function homeNavItem(
  items: readonly NavItem[],
  permissions: readonly string[] | undefined,
  hasConnection: boolean,
): NavItem | undefined {
  const visible = visibleNavItems(items, permissions);
  if (!hasConnection) {
    const usable = visible.find((item) => !item.needsConnection);
    if (usable) return usable;
  }
  return visible[0];
}
