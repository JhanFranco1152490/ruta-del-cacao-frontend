import { groupInOrder } from '@/lib/group-in-order';

import type { PermissionItem } from './api';

// Las secciones del catálogo de permisos, en el orden en que se trabaja: primero lo de la asociación
// (productores), luego lo del campo (fincas, sus parcelas, la ficha de cada parcela, los insumos, las
// actividades, la sanidad, las cosechas, los lotes, la fermentación y la infraestructura) y al final
// la administración (cuentas y roles). El servidor manda el área como una clave interna ("farms",
// "crops"); aquí se le da nombre. Un área que no está aquí va después de las conocidas, por su clave.
const AREAS = [
  { area: 'producers', label: 'Productores' },
  { area: 'farms', label: 'Fincas' },
  { area: 'plots', label: 'Parcelas' },
  { area: 'crops', label: 'Caracterización de parcelas' },
  { area: 'inputs', label: 'Insumos' },
  { area: 'activities', label: 'Actividades' },
  { area: 'health', label: 'Sanidad' },
  { area: 'harvests', label: 'Cosechas' },
  { area: 'lots', label: 'Lotes' },
  { area: 'fermentation', label: 'Fermentación' },
  { area: 'drying', label: 'Secado' },
  { area: 'facilities', label: 'Infraestructura' },
  { area: 'postharvest_parameters', label: 'Parámetros de poscosecha' },
  { area: 'users', label: 'Cuentas' },
  { area: 'roles', label: 'Roles' },
] as const;

export type PermissionGroup = {
  area: string;
  label: string;
  items: PermissionItem[];
};

export type RolePermissionGroup = {
  area: string;
  label: string;
  items: { code: string; name: string }[];
};

const RANK = new Map<string, number>(
  AREAS.map(({ area }, index) => [area, index]),
);
const LABEL = new Map<string, string>(
  AREAS.map(({ area, label }) => [area, label]),
);
const rankOf = (area: string) => RANK.get(area) ?? Number.POSITIVE_INFINITY;

function groupByArea<T>(items: readonly T[], areaOf: (item: T) => string) {
  return groupInOrder(items, areaOf, (_, area) => LABEL.get(area) ?? area)
    .map(({ key, title, items: grouped }) => ({
      area: key,
      label: title,
      items: grouped,
    }))
    .sort(
      (a, b) => rankOf(a.area) - rankOf(b.area) || a.area.localeCompare(b.area),
    );
}

export function groupPermissionsByArea(
  catalog: readonly PermissionItem[],
): PermissionGroup[] {
  return groupByArea(catalog, (item) => item.area);
}

// Lo que un rol tiene concedido, por área. El permiso trae su área en el código (`farms.view_farm`),
// no como campo aparte, porque el rol solo manda el código y el nombre.
export function groupRolePermissions(
  details: readonly { code: string; name: string }[],
): RolePermissionGroup[] {
  return groupByArea(details, (item) => item.code.split('.')[0] ?? item.code);
}
