'use client';

import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';

import { type ActivityFilters, hasActivityFilters } from './activity-filters';
import type { ActivityState } from './activity-state';

const STATES = [
  'scheduled',
  'delayed',
  'overdue',
  'done',
] as const satisfies readonly ActivityState[];

// Un valor malformado en la URL (?estado=zzz) o vacío (?parcela=) cuenta como "sin filtro".
const parsers = {
  farm: parseAsString,
  plot: parseAsString,
  state: parseAsStringLiteral(STATES),
  assignee: parseAsString,
  producer: parseAsString,
};

// En la URL los parámetros van en español, como las rutas.
const urlKeys = {
  farm: 'finca',
  plot: 'parcela',
  state: 'estado',
  assignee: 'responsable',
  producer: 'productor',
};

// Los filtros del calendario (finca, parcela, estado y responsable) viven en la URL: se pueden compartir y el botón atrás los respeta.
// `userId` es la persona de la sesión, para el atajo "Asignadas a mí".
export function useActivityFilters(userId: string | undefined) {
  const [params, setParams] = useQueryStates(parsers, { urlKeys });

  const filters: ActivityFilters = {
    farm: params.farm || null,
    plot: params.plot || null,
    state: params.state,
    assignee: params.assignee || null,
  };
  // No es un filtro más sino de qué productor se trata; solo lo usa la cuenta técnica, y la
  // pantalla lo ignora para las demás cuentas.
  const producer = params.producer || null;
  const assignedToMe = !!userId && filters.assignee === userId;

  return {
    filters,
    producer,
    hasFilters: hasActivityFilters(filters),
    assignedToMe,
    // La parcela elegida puede ser de otra finca: al cambiar la finca se vuelve a elegir.
    setFarm: (farm: string | null) => setParams({ farm, plot: null }),
    setPlot: (plot: string | null) => setParams({ plot }),
    setState: (state: ActivityState | null) => setParams({ state }),
    setAssignee: (assignee: string | null) => setParams({ assignee }),
    // La finca, la parcela y el responsable elegidos eran del productor anterior: se vuelven a elegir.
    setProducer: (producer: string | null) =>
      setParams({ producer, farm: null, plot: null, assignee: null }),
    toggleAssignedToMe: () =>
      setParams({ assignee: assignedToMe || !userId ? null : userId }),
    clear: () =>
      setParams({ farm: null, plot: null, state: null, assignee: null }),
  };
}
