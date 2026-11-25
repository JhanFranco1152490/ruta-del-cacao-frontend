import type { SearchSelectOption } from '@/components/search-select';

import type { AuditOptionActor } from './api';

// Las cuentas del productor para filtrar por usuario. Una inactiva sigue en la lista, porque sus
// cambios siguen en la bitácora, y lo dice.
export const actorOptions = (
  actors: readonly AuditOptionActor[],
): SearchSelectOption[] =>
  actors.map(({ id, full_name, is_active }) => ({
    id,
    label: is_active ? full_name : `${full_name} (inactiva)`,
  }));

// Cuántos cambios trae la bitácora con los filtros puestos, en todas sus páginas.
export const changesCountLabel = (count: number) =>
  count === 1 ? '1 cambio' : `${count.toLocaleString('es')} cambios`;
