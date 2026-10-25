import {
  Bug,
  CalendarDays,
  FlaskConical,
  LandPlot,
  Leaf,
  MapPinned,
  Package,
  ShieldCheck,
  ShieldPlus,
  Sprout,
  Thermometer,
  Users,
  Warehouse,
  Wheat,
} from 'lucide-react';

import { PERMISSIONS } from '@/lib/permissions';
import type { NavGroupKey, NavItem } from '@/types/navigation';

// Cada sección nueva de la app se suma aquí con una entrada y su grupo. El menú agrupa en el orden en
// que aparecen las entradas, así que un grupo sale donde aparece la primera que la persona ve:
// Administración arranca con Productores (primero para la asociación) y termina con Usuarios y
// Roles (último para el productor, que solo ve esas dos). El orden decide también dónde entra cada
// persona: en la primera sección que puede ver.
export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: '/productores',
    label: 'Productores',
    group: 'admin',
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
    group: 'farm',
    icon: MapPinned,
    permission: PERMISSIONS.FARMS_VIEW,
  },
  {
    href: '/parcelas',
    label: 'Parcelas',
    ownLabel: 'Mis parcelas',
    group: 'farm',
    icon: LandPlot,
    permission: PERMISSIONS.PLOTS_VIEW,
    routes: ['/fincas/parcelas'],
  },
  {
    href: '/insumos',
    label: 'Insumos',
    group: 'farm',
    icon: FlaskConical,
    permission: PERMISSIONS.INPUTS_VIEW,
  },
  {
    href: '/actividades',
    label: 'Actividades',
    group: 'agriculture',
    icon: CalendarDays,
    permission: PERMISSIONS.ACTIVITIES_VIEW,
  },
  // El historial de los monitoreos con sus filtros. Desde la tarjeta de una parcela se abre ya
  // filtrado por ella y, con una copia guardada, también sin conexión; la entrada del menú pide
  // conexión porque lo primero que muestra es la lista completa.
  {
    href: '/sanidad',
    label: 'Sanidad',
    group: 'agriculture',
    icon: ShieldPlus,
    permission: PERMISSIONS.ACTIVITIES_VIEW,
    needsConnection: true,
  },
  // Cosechas y lotes van juntas, después de las labores: es el orden del cacao.
  {
    href: '/cosechas',
    label: 'Cosechas',
    group: 'postharvest',
    icon: Wheat,
    permission: PERMISSIONS.HARVESTS_VIEW,
  },
  {
    href: '/lotes',
    label: 'Lotes',
    group: 'postharvest',
    icon: Package,
    permission: PERMISSIONS.LOTS_VIEW,
    needsConnection: true,
  },
  // Después de los lotes sigue su proceso. Se consulta sin conexión, con la copia del dispositivo.
  {
    href: '/fermentacion',
    label: 'Fermentación',
    group: 'postharvest',
    icon: Thermometer,
    permission: PERMISSIONS.FERMENTATION_LOG_TURNS,
  },
  // Los cajones y marquesinas donde los lotes fermentan y se secan: lo que se prepara para el
  // proceso, por eso va al final del grupo. Se consulta sin conexión.
  {
    href: '/infraestructura',
    label: 'Infraestructura',
    group: 'postharvest',
    icon: Warehouse,
    permission: PERMISSIONS.FACILITIES_VIEW,
  },
  {
    href: '/variedades',
    label: 'Variedades de cacao',
    group: 'catalogs',
    icon: Leaf,
    permission: PERMISSIONS.CROPS_MANAGE_VARIETIES,
    needsConnection: true,
  },
  {
    href: '/plagas-enfermedades',
    label: 'Plagas y enfermedades',
    group: 'catalogs',
    icon: Bug,
    permission: PERMISSIONS.HEALTH_MANAGE_PEST_DISEASE,
    needsConnection: true,
  },
  {
    href: '/usuarios',
    label: 'Usuarios',
    group: 'admin',
    icon: Users,
    permission: PERMISSIONS.USERS_VIEW,
    needsConnection: true,
  },
  {
    href: '/roles',
    label: 'Roles y permisos',
    group: 'admin',
    icon: ShieldCheck,
    permission: PERMISSIONS.ROLES_VIEW,
    needsConnection: true,
  },
];

export const NAV_GROUP_LABELS: Record<NavGroupKey, string> = {
  admin: 'Administración',
  farm: 'Finca',
  agriculture: 'Manejo agrícola',
  postharvest: 'Cosecha y poscosecha',
  catalogs: 'Catálogos',
};

export type NavSection = {
  // Sin clave: las entradas sueltas (Productores), que van arriba sin encabezado.
  key: NavGroupKey | null;
  items: NavItem[];
};

// Las entradas que la persona ve, agrupadas en el orden en que aparecen. Los encabezados solo
// tienen sentido si hay dos o más grupos: con uno, el menú queda plano como antes.
export function groupNavItems(items: readonly NavItem[]): {
  sections: NavSection[];
  showHeadings: boolean;
} {
  const sections: NavSection[] = [];
  for (const item of items) {
    const key = item.group ?? null;
    const section = sections.find((s) => s.key === key);
    if (section) section.items.push(item);
    else sections.push({ key, items: [item] });
  }
  return {
    sections,
    showHeadings: sections.filter((s) => s.key !== null).length >= 2,
  };
}

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
