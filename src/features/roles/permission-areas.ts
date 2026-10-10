import type { PermissionItem } from './api';

// Las secciones del catálogo de permisos, en el orden en que se trabaja: primero lo de la asociación
// (productores), luego lo del campo (fincas, sus parcelas, la ficha de cada parcela y los insumos) y al final la
// administración (cuentas y roles). El servidor manda el área como una clave interna ("farms",
// "crops"); aquí se le da nombre. Un área que no está aquí va después de las conocidas, por su clave.
const AREAS = [
  { area: 'producers', label: 'Productores' },
  { area: 'farms', label: 'Fincas' },
  { area: 'plots', label: 'Parcelas' },
  { area: 'crops', label: 'Caracterización de parcelas' },
  { area: 'inputs', label: 'Insumos' },
  { area: 'users', label: 'Cuentas' },
  { area: 'roles', label: 'Roles' },
] as const;

export type PermissionGroup = {
  area: string;
  label: string;
  items: PermissionItem[];
};

export function groupPermissionsByArea(
  catalog: readonly PermissionItem[],
): PermissionGroup[] {
  const known = new Map<string, number>(
    AREAS.map(({ area }, index) => [area, index]),
  );
  const labelOf = new Map<string, string>(
    AREAS.map(({ area, label }) => [area, label]),
  );
  const groups = new Map<string, PermissionGroup>();
  for (const item of catalog) {
    let group = groups.get(item.area);
    if (!group) {
      group = {
        area: item.area,
        label: labelOf.get(item.area) ?? item.area,
        items: [],
      };
      groups.set(item.area, group);
    }
    group.items.push(item);
  }
  return [...groups.values()].sort((a, b) => {
    const rankA = known.get(a.area) ?? Number.POSITIVE_INFINITY;
    const rankB = known.get(b.area) ?? Number.POSITIVE_INFINITY;
    return rankA - rankB || a.area.localeCompare(b.area);
  });
}
