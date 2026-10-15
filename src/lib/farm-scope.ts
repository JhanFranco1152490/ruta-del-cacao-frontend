import type { components } from '@/lib/api/schema';

type FarmScoped = Pick<
  components['schemas']['SessionUser'],
  'all_farms' | 'farms' | 'producer_id'
>;

// Un empleado de un productor: trabaja en las fincas que le asignaron y nada más. No lo son el
// Productor ni la cuenta técnica, que alcanzan todas, ni el Administrador de la asociación, que no
// es de ningún productor y nunca lleva fincas.
export const isFarmEmployee = (user: FarmScoped | undefined) =>
  !!user && user.producer_id !== null && !user.all_farms;

// La finca de quien trabaja en una sola: los selectores de finca van fijos en ella, porque el
// servidor no le devuelve nada de otra y «Todas las fincas» sería lo mismo. Nula para quien
// alcanza todas (el Productor, la cuenta técnica) o atiende varias, que sí eligen.
export const onlyFarmOf = (user: FarmScoped | undefined) =>
  user && isFarmEmployee(user) && user.farms.length === 1
    ? user.farms[0]
    : null;

// Lo que un rol admite para el alcance de las cuentas que lo tienen: `all` (siempre todas las
// fincas), `one` (exactamente una) o `many` (una, varias o todas, a elección). Es un límite y no
// el valor: el valor lo tiene la cuenta.
export type RoleScope = 'all' | 'one' | 'many';
export type RequiredScope = RoleScope | 'conflict';

export const ROLE_SCOPES: readonly {
  value: RoleScope;
  label: string;
  hint: string;
}[] = [
  {
    value: 'many',
    label: 'Una o varias fincas',
    hint: 'Quien lo tenga trabaja en las fincas que se le asignen, o en todas.',
  },
  {
    value: 'one',
    label: 'Una sola finca',
    hint: 'Quien lo tenga trabaja en una finca, no en varias ni en todas.',
  },
  {
    value: 'all',
    label: 'Siempre todas las fincas',
    hint: 'Quien lo tenga trabaja en todas las fincas, también en las que se registren después.',
  },
];

export const roleScopeLabel = (scope: RoleScope) =>
  ROLE_SCOPES.find((option) => option.value === scope)?.label ?? scope;

// Un rol sin alcance (Productor, Administrador) no lleva fincas: no pide nada.
const scopeOf = (role: { farm_scope?: string | null }): RoleScope =>
  role.farm_scope === 'all' || role.farm_scope === 'one'
    ? role.farm_scope
    : 'many';

// Lo que piden varios roles juntos: `all` o `one` mandan sobre `many`; pedir las dos es un choque.
// Es la misma regla del servidor, para ofrecer solo lo que se va a aceptar.
export function scopeOfRoles(
  roles: readonly { farm_scope?: string | null }[],
): RequiredScope {
  const scopes = new Set(roles.map(scopeOf));
  if (scopes.has('all') && scopes.has('one')) return 'conflict';
  if (scopes.has('all')) return 'all';
  if (scopes.has('one')) return 'one';
  return 'many';
}

// El alcance de una cuenta: todas las fincas o una lista.
export type AccountScope = { all_farms: boolean; farm_ids: string[] };

// El alcance tal como lo dejan los roles: con `all` siempre todas; con `one` nunca «todas».
export function effectiveScope(
  required: RequiredScope,
  scope: AccountScope,
): AccountScope {
  if (required === 'all') return { all_farms: true, farm_ids: [] };
  if (required === 'one' && scope.all_farms) {
    return { all_farms: false, farm_ids: [] };
  }
  return scope.all_farms ? { all_farms: true, farm_ids: [] } : scope;
}

export const SCOPE_REQUIRED =
  'Indica en qué fincas trabaja o marca todas las fincas.';
export const ONE_FARM_REQUIRED = 'Estos roles piden exactamente una finca.';
export const SCOPE_CONFLICT =
  'Estos roles piden alcances distintos: uno todas las fincas y otro una sola. Quita uno.';

// Por qué un alcance no sirve para esos roles, o `null` si sirve.
export function scopeProblem(
  required: RequiredScope,
  scope: AccountScope,
): string | null {
  if (required === 'conflict') return SCOPE_CONFLICT;
  const { all_farms, farm_ids } = effectiveScope(required, scope);
  if (!all_farms && farm_ids.length === 0) return SCOPE_REQUIRED;
  if (required === 'one' && farm_ids.length !== 1) return ONE_FARM_REQUIRED;
  return null;
}

// Lo que viaja en la petición: las fincas, o «todas», nunca las dos.
export const scopeBody = (scope: AccountScope) =>
  scope.all_farms ? { all_farms: true as const } : { farm_ids: scope.farm_ids };

// Si dos listas de fincas son las mismas, sin importar el orden en que se marcaron.
export const sameFarms = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

export const sameScope = (a: AccountScope, b: AccountScope) =>
  a.all_farms === b.all_farms && sameFarms(a.farm_ids, b.farm_ids);
