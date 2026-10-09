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
  // Fincas y parcelas van seguidas: es el orden en que el productor trabaja. La caracterización
  // de cada parcela se hace desde su tarjeta, en Parcelas.
  {
    href: '/fincas',
    label: 'Fincas',
    ownLabel: 'Mis fincas',
    icon: MapPinned,
    permission: PERMISSIONS.FARMS_VIEW,
  },
  {
    href: '/parcelas',
    label: 'Parcelas',
    ownLabel: 'Mis parcelas',
    icon: LandPlot,
    permission: PERMISSIONS.PLOTS_VIEW,
    routes: ['/fincas/parcelas'],
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
  // Quien tiene un productor propio ve solo lo suyo, y el menú lo nombra así.
  { ownProducer = false } = {},
): NavItem[] {
  const allowed = (permission?: string) =>
    !permission || !!permissions?.includes(permission);
  return items
    .filter(({ permission }) => allowed(permission))
    .map((item) => {
      const label = (ownProducer && item.ownLabel) || item.label;
      if (!item.children && label === item.label) return item;
      return {
        ...item,
        label,
        ...(item.children && {
          children: item.children.filter(({ permission }) =>
            allowed(permission),
          ),
        }),
      };
    });
}

// El prefijo exige la barra: '/productores-x' no cuenta como hija de '/productores'.
export function isActiveRoute(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// La sección a la que pertenece una ruta, o ninguna (como la entrada, `/`). Si varias la
// reclaman gana la más específica: /fincas/parcelas/nueva es de Parcelas, no de Fincas.
export function navItemForPath(
  items: readonly NavItem[],
  pathname: string,
): NavItem | undefined {
  let found: NavItem | undefined;
  let length = -1;
  for (const item of items) {
    for (const route of [item.href, ...(item.routes ?? [])]) {
      if (isActiveRoute(route, pathname) && route.length > length) {
        found = item;
        length = route.length;
      }
    }
  }
  return found;
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
