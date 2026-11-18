import {
  Boxes,
  Bug,
  CalendarDays,
  ChartColumn,
  ClipboardCheck,
  FileSpreadsheet,
  FlaskConical,
  Handshake,
  LandPlot,
  Leaf,
  MapPinned,
  Package,
  Receipt,
  ShieldCheck,
  ShieldPlus,
  SlidersHorizontal,
  Sprout,
  Sun,
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
  // Y después de la fermentación, el secado. También se consulta sin conexión.
  {
    href: '/secado',
    label: 'Secado',
    group: 'postharvest',
    icon: Sun,
    permission: PERMISSIONS.DRYING_LOG,
  },
  // Lo que se hace con el lote seco: evaluarlo y clasificarlo o descartarlo. Se registra con conexión,
  // pero la lista se consulta sin ella, con la copia del dispositivo.
  {
    href: '/calidad',
    label: 'Calidad',
    group: 'postharvest',
    icon: ClipboardCheck,
    permission: PERMISSIONS.QUALITY_EVALUATE,
  },
  // El cacao seco clasificado: ingresarlo, ver cuánto hay de cada calibre y registrar lo que sale.
  // Los movimientos son con conexión; las existencias se consultan sin ella, con la copia.
  {
    href: '/bodega',
    label: 'Bodega',
    group: 'postharvest',
    icon: Boxes,
    permission: PERMISSIONS.WAREHOUSE_VIEW_STOCK,
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
  // Los valores con los que se evalúa el secado: de oficina, pero se consultan sin conexión con la
  // copia del dispositivo.
  {
    href: '/parametros-poscosecha',
    label: 'Parámetros',
    group: 'postharvest',
    icon: SlidersHorizontal,
    permission: PERMISSIONS.PARAMETERS_VIEW,
  },
  // Lo que sigue al cacao en bodega: a quién se le vende. El directorio es de todo el productor, no
  // de una finca. Se registra con conexión y se consulta sin ella, con la copia del dispositivo.
  {
    href: '/compradores',
    label: 'Compradores',
    group: 'sales',
    icon: Handshake,
    permission: PERMISSIONS.BUYERS_VIEW,
  },
  // Cada venta saca de bodega el cacao de una finca, así que un empleado solo ve las de sus fincas.
  // Se registra y se anula con conexión; la lista y la ficha se consultan con la copia.
  {
    href: '/ventas',
    label: 'Ventas',
    group: 'sales',
    icon: Receipt,
    permission: PERMISSIONS.SALES_VIEW,
  },
  // Las cifras de todo lo anterior, calculadas al consultar: solo con conexión.
  {
    href: '/indicadores',
    label: 'Indicadores',
    group: 'follow-up',
    icon: ChartColumn,
    permission: [
      PERMISSIONS.INDICATORS_VIEW_PRODUCER,
      PERMISSIONS.INDICATORS_VIEW_ASSOCIATION,
    ],
    needsConnection: true,
  },
  // Las mismas cifras, una fila por registro o por finca, para revisarlas o descargarlas. También se
  // calculan al consultar.
  {
    href: '/reportes',
    label: 'Reportes',
    group: 'follow-up',
    icon: FileSpreadsheet,
    permission: [
      PERMISSIONS.REPORTS_VIEW_PRODUCER,
      PERMISSIONS.REPORTS_VIEW_ASSOCIATION,
    ],
    needsConnection: true,
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
  sales: 'Comercialización',
  'follow-up': 'Seguimiento',
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
  const allowed = (permission?: string | readonly string[]) =>
    !permission ||
    [permission].flat().some((code) => !!permissions?.includes(code));
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
