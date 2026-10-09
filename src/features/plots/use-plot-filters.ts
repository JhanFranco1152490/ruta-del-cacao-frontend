'use client';

import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';

import { usePaginatedSearch } from '@/hooks/use-paginated-search';

import type { PlotQuery } from './api';

export const CHARACTERIZATION_STATES = [
  'sin-caracterizar',
  'caracterizadas',
  'con-error',
] as const;
export const GROUPINGS = ['ninguno', 'productor', 'finca'] as const;

export type CharacterizationState = (typeof CHARACTERIZATION_STATES)[number];
export type Grouping = (typeof GROUPINGS)[number];

// Los filtros de la pantalla de parcelas viven en la URL, como los de fincas: se pueden compartir
// y el botón atrás los respeta. Un valor malformado cae al de por defecto.
const parsers = {
  search: parseAsString.withDefault(''),
  farm: parseAsString,
  producer: parseAsString,
  characterization: parseAsStringLiteral(CHARACTERIZATION_STATES),
  grouping: parseAsStringLiteral(GROUPINGS).withDefault('finca'),
  page: parseAsInteger.withDefault(1),
};
const urlKeys = {
  search: 'buscar',
  farm: 'finca',
  producer: 'productor',
  characterization: 'caracterizacion',
  grouping: 'agrupar',
  page: 'pagina',
};

// "Con error" es solo del dispositivo: el servidor no sabe qué envío falló, así que no se le pide.
const SERVER_CHARACTERIZATION = {
  'sin-caracterizar': 'pending',
  caracterizadas: 'done',
  'con-error': undefined,
} as const;

// `ownProducer`: quien ve solo lo suyo no filtra ni agrupa por productor (sería uno solo).
export function usePlotFilters({ ownProducer }: { ownProducer: boolean }) {
  const [params, setParams] = useQueryStates(parsers, { urlKeys });
  const search = usePaginatedSearch(params.search, setParams);
  const page = Math.max(1, params.page);
  // Un parámetro vacío es "sin filtro", no un id vacío que llegue a la consulta.
  const farm = params.farm || null;
  const producer = ownProducer ? null : params.producer || null;
  const grouping: Grouping =
    ownProducer && params.grouping === 'productor' ? 'finca' : params.grouping;
  const query: PlotQuery = {
    search: params.search.trim() || undefined,
    farm: farm ?? undefined,
    producer: producer ?? undefined,
    characterization: params.characterization
      ? SERVER_CHARACTERIZATION[params.characterization]
      : undefined,
    // Agrupada, la lista llega en el orden de los grupos: así cada grupo sale completo en su
    // página, salvo en el corte entre una y otra.
    ordering: grouping === 'ninguno' ? 'code' : 'producer,farm,code',
    page,
  };
  return {
    query,
    page,
    farm,
    producer,
    characterization: params.characterization,
    grouping,
    // Solo lo que falló en el dispositivo: la lista del servidor no aplica.
    onlyErrors: params.characterization === 'con-error',
    filtered: !!(query.search || farm || producer || params.characterization),
    ...search,
    // Elegir una finca deja dicho su productor.
    setFarm: (id: string | null, producerId?: string) =>
      setParams({
        farm: id,
        ...(producerId && !ownProducer ? { producer: producerId } : {}),
        page: 1,
      }),
    // Las fincas son de un productor: al cambiarlo, la finca elegida deja de servir.
    setProducer: (id: string | null) =>
      setParams({ producer: id, farm: null, page: 1 }),
    setCharacterization: (characterization: CharacterizationState | null) =>
      setParams({ characterization, page: 1 }),
    setGrouping: (next: Grouping) => setParams({ grouping: next, page: 1 }),
    setPage: (next: number) => setParams({ page: next }),
  };
}
