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
